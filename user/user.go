package user

import (
	"bytes"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
	"github.com/disintegration/imaging"
	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/robfig/cron/v3"
)

const (
	userInfoExpireTime = time.Hour * 24
)

var (
	nameRegexp = regexp.MustCompile(`^(.+?)(?: \((.+)\))?$`)
)

func getImage(imageID uuid.UUID) ([]byte, error) {
	// https://wiki.secondlife.com/wiki/Picture_Service
	url := fmt.Sprintf(
		`https://picture-service.secondlife.com/%s/128x96.png`,
		imageID.String(),
	)

	res, err := http.Get(url)
	if err != nil {
		return []byte{}, err
	}
	defer res.Body.Close()

	image, err := imaging.Decode(res.Body)
	if err != nil {
		return []byte{}, err
	}

	image = imaging.Resize(image, 64, 64, imaging.Lanczos)

	output := bytes.NewBuffer(nil)
	err = imaging.Encode(output, image, imaging.JPEG, imaging.JPEGQuality(90))
	if err != nil {
		return []byte{}, err
	}

	return output.Bytes(), nil
}

type imageWithID struct {
	id   uuid.UUID
	data []byte
}

func getInfoAndImage(userID uuid.UUID) (UserInfo, imageWithID, error) {
	userInfo := UserInfo{
		LastUpdated: time.Now(),
	}

	res, err := http.Get("https://world.secondlife.com/resident/" + userID.String())
	if err != nil {
		return userInfo, imageWithID{}, err
	}
	defer res.Body.Close()

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return userInfo, imageWithID{}, err
	}

	titleEl := doc.Find("title")
	if titleEl == nil {
		return userInfo, imageWithID{}, errors.New("failed to get <title>")
	}

	usernameMatches := nameRegexp.FindStringSubmatch(titleEl.Text())
	if len(usernameMatches) == 0 {
		return userInfo, imageWithID{}, errors.New("failed to match from <title>")
	}

	if usernameMatches[2] == "" {
		userInfo.Username = strings.TrimSpace(usernameMatches[1])
	} else {
		userInfo.Username = strings.TrimSpace(usernameMatches[2])
		userInfo.DisplayName = strings.TrimSpace(usernameMatches[1])
	}

	// we're done. try to get an image but don't error if it fails

	imageIDMetaEl := doc.Find(`meta[name="imageid"]`)
	if imageIDMetaEl == nil {
		return userInfo, imageWithID{}, nil
	}

	imageIDStr, ok := imageIDMetaEl.Attr("content")
	if !ok {
		return userInfo, imageWithID{}, nil
	}

	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		slog.Warn(
			"failed to parse image", "uuid", imageIDStr, "err", err,
		)
		return userInfo, imageWithID{}, nil
	}

	if imageID == uuid.Nil {
		return userInfo, imageWithID{}, nil
	}

	imageData, err := getImage(imageID)
	if err != nil {
		slog.Warn(
			"failed to get image", "user", userID, "id", imageID,
			"err", err,
		)
		return userInfo, imageWithID{}, nil
	}

	return userInfo, imageWithID{
		id:   imageID,
		data: imageData,
	}, nil
}

// func init() {
// 	if env.DEV {
// 		// for testing
// 		a, _ := getInfo(uuid.MustParse("b7c5f366-7a39-4289-8157-d3a8ae6d57f4"))
// 		fmt.Printf("%#v\n", a)
// 		b, _ := getInfo(uuid.MustParse("e995ae51-4450-4513-b6ab-7f2f69c08406"))
// 		fmt.Printf("%#v\n", b)
// 		os.Exit(0)
// 	}
// }

func updateUserInfo(userID uuid.UUID, user *User) bool {
	newInfo, newImage, err := getInfoAndImage(userID)
	if err != nil {
		slog.Error(
			"failed to get user info. will still track",
			"user", userID,
			"err", err,
		)
		return false
	}

	user.Info = newInfo

	// if newImage is empty, function below will delete

	err = putUserImage(userID, newImage.id, newImage.data)
	if err != nil {
		slog.Error(
			"failed to put user image. will ignore for now",
			"user", userID,
			"err", err,
		)
		// its still fresh so just fall through
	}

	return true
}

func everyMinute() {
	now := time.Now()
	onlineUUIDs := lsl.GetOnlineUUIDs(lsl.GetData())

	// only get fresh info for users currently online
	// if it hasnt been updated for as long as the expire time

	var totalFresh int

	for i := range onlineUUIDs {
		user, err, _ := getUser(onlineUUIDs[i])
		if err != nil {
			// dont want to do anything if we failed to get user
			// could potentially be catastrophic
			// should report this somewhere really
			slog.Error("update user failed", "err", err)
			continue
		}

		// dont need to do anything if not found, as User{} will be empty

		user.Minutes++
		user.LastSeen = now

		if user.Info.LastUpdated.Add(userInfoExpireTime).Before(now) {
			fresh := updateUserInfo(onlineUUIDs[i], &user)
			if fresh {
				totalFresh++
			}
		}

		err = putUser(onlineUUIDs[i], user)
		if err != nil {
			slog.Error("update user failed", "err", err)
			continue
		}
	}

	if env.DEV && totalFresh > 0 {
		slog.Info("got fresh for", "users", totalFresh)
	}
}

func InitCron(cron *cron.Cron) {
	var err error
	if env.DEV {
		// once a second for testing
		_, err = cron.AddFunc("*/1 * * * * *", everyMinute)
		slog.Warn("user interval cron set to once a second!")
	} else {
		_, err = cron.AddFunc("0 * * * * *", everyMinute)
	}

	if err != nil {
		panic(err)
	}

	slog.Info("started user interval cron")
}
