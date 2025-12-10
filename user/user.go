package user

import (
	"errors"
	"log/slog"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/PuerkitoBio/goquery"
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

func getInfo(userID uuid.UUID) (UserInfo, error) {
	userInfo := UserInfo{
		LastUpdated: time.Now(),
	}

	res, err := http.Get("https://world.secondlife.com/resident/" + userID.String())
	if err != nil {
		return userInfo, err
	}
	defer res.Body.Close()

	doc, err := goquery.NewDocumentFromReader(res.Body)
	if err != nil {
		return userInfo, err
	}

	titleEl := doc.Find("title")
	if titleEl == nil {
		return userInfo, errors.New("failed to get <title>")
	}

	usernameMatches := nameRegexp.FindStringSubmatch(titleEl.Text())
	if len(usernameMatches) == 0 {
		return userInfo, errors.New("failed to match from <title>")
	}

	if usernameMatches[2] == "" {
		userInfo.Username = strings.TrimSpace(usernameMatches[1])
	} else {
		userInfo.Username = strings.TrimSpace(usernameMatches[2])
		userInfo.DisplayName = strings.TrimSpace(usernameMatches[1])
	}

	imageIDMetaEl := doc.Find(`meta[name="imageid"]`)
	if imageIDMetaEl == nil {
		return userInfo, nil
	}

	imageIDStr, ok := imageIDMetaEl.Attr("content")
	if !ok {
		return userInfo, nil
	}

	imageID, err := uuid.Parse(imageIDStr)
	if err != nil {
		slog.Warn("failed to parse image", "uuid", imageIDStr)
		return userInfo, nil
	}

	userInfo.ImageID = imageID

	return userInfo, nil
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

func everyMinute() {
	now := time.Now()
	onlineUUIDs := lsl.GetOnlineUUIDs()

	// only get fresh info for users currently online
	// if it hasnt been updated for as long as the expire time

	var gotFreshFor []string

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
			// get fresh
			newInfo, err := getInfo(onlineUUIDs[i])
			if err != nil {
				slog.Error(
					"failed to get user info. will still track",
					"uuid", onlineUUIDs[i],
					"err", err,
				)
			} else {
				user.Info = newInfo
				gotFreshFor = append(gotFreshFor, user.Info.Username)
			}
		}

		err = putUser(onlineUUIDs[i], user)
		if err != nil {
			slog.Error("update user failed", "err", err)
			continue
		}
	}

	if len(gotFreshFor) > 0 {
		slog.Info("got fresh for", "users", gotFreshFor)
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
