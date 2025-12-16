package main

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"slices"
	"sync"
	"time"

	"github.com/disintegration/imaging"
	"github.com/fxamacker/cbor/v2"
	"github.com/google/uuid"
	"github.com/schollz/progressbar/v3"
	"go.etcd.io/bbolt"
	"golang.org/x/sync/semaphore"
)

// convert image ids in user info to 64x64 images
// store them in bucket userImages, key <user uuid>
// also keep image id in key <user uuid>:id

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

type UserInfo struct {
	_           struct{}  `cbor:",toarray"`
	LastUpdated time.Time `json:"lastUpdated"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	ImageID     uuid.UUID `json:"imageID"`
}

type User struct {
	_        struct{}  `cbor:",toarray"`
	Minutes  uint64    `json:"minutes"`
	LastSeen time.Time `json:"lastSeen"`
	Info     UserInfo  `json:"info"`
}

type NewUserInfo struct {
	_           struct{}  `cbor:",toarray"`
	LastUpdated time.Time `json:"lastUpdated"`
	Username    string    `json:"username"`
	DisplayName string    `json:"displayName"`
	// remove ImageID
}

type NewUser struct {
	_        struct{}    `cbor:",toarray"`
	Minutes  uint64      `json:"minutes"`
	LastSeen time.Time   `json:"lastSeen"`
	Info     NewUserInfo `json:"info"`
}

func migrate(tx *bbolt.Tx) error {
	usersBucket := tx.Bucket([]byte("users"))
	if usersBucket == nil {
		return errors.New("users bucket doesn't exist")
	}

	// tx.DeleteBucket([]byte("userImages"))

	userImagesBucket := tx.Bucket([]byte("userImages"))
	if userImagesBucket != nil {
		return errors.New("user images bucket already exist")
	}

	var err error
	userImagesBucket, err = tx.CreateBucket([]byte("userImages"))
	if err != nil {
		return err
	}

	workers := int64(8)
	ctx := context.Background()
	sem := semaphore.NewWeighted(workers)

	totalUsers := usersBucket.Inspect().KeyN
	bar := progressbar.Default(int64(totalUsers))

	userImageMap := sync.Map{}
	expectedErrs := sync.Map{}

	c := usersBucket.Cursor()
	for k, v := c.First(); k != nil; k, v = c.Next() {
		if len(k) != 16 {
			return fmt.Errorf("found id not 16 bytes: %v", k)
		}

		userID := uuid.UUID(k)

		var user User
		err = cbor.Unmarshal(v, &user)
		if err != nil {
			return errors.New("failed to unmarshal user: " + err.Error())
		}

		if user.Info.ImageID == uuid.Nil {
			bar.Add(1)
			continue
		}

		err = sem.Acquire(ctx, 1)
		if err != nil {
			return errors.New("failed to acquire semaphore: " + err.Error())
		}

		go func() {
			defer bar.Add(1)
			defer sem.Release(1)

			imageData, err := getImage(user.Info.ImageID)
			if err != nil {
				expectedErrs.Store(fmt.Sprintf(
					"couldn't get image for: %s (%s)",
					user.Info.DisplayName, user.Info.Username,
				), struct{}{})
				return
			}

			userImageMap.Store(userID, imageData)
		}()
	}

	err = sem.Acquire(ctx, workers)
	if err != nil {
		return errors.New("failed to acquire semaphore: " + err.Error())
	}

	bar.Close()
	fmt.Println()

	expectedErrs.Range(func(key, value any) bool {
		fmt.Println(key.(string))
		return true
	})

	savedTotal := 0

	for k, v := c.First(); k != nil; k, v = c.Next() {
		if len(k) != 16 {
			return fmt.Errorf("found id not 16 bytes: %v", k)
		}

		userID := uuid.UUID(k)

		var user User
		err = cbor.Unmarshal(v, &user)
		if err != nil {
			return errors.New("failed to unmarshal user: " + err.Error())
		}

		imageData, ok := userImageMap.Load(userID)
		if ok {
			userImagesBucket.Put(userID[:], imageData.([]byte))
			userImagesBucket.Put(
				slices.Concat(userID[:], []byte(":id")),
				user.Info.ImageID[:],
			)
			savedTotal++
		}

		// update user

		var newUser = NewUser{
			Minutes:  user.Minutes,
			LastSeen: user.LastSeen,
			Info: NewUserInfo{
				LastUpdated: user.Info.LastUpdated,
				Username:    user.Info.Username,
				DisplayName: user.Info.DisplayName,
			},
		}

		newUserBytes, err := cbor.Marshal(&newUser)
		if err != nil {
			return errors.New("failed to update user: " + err.Error())
		}

		usersBucket.Put(userID[:], newUserBytes)
	}

	fmt.Printf("saved %d images for %d users\n", savedTotal, totalUsers)

	return nil
}

func main() {
	if len(os.Args) < 2 {
		panic("usage: <db path>")
	}

	db, err := bbolt.Open(os.Args[1], 0600, nil)
	if err != nil {
		panic(err)
	}

	err = db.Update(migrate)
	if err != nil {
		panic(err)
	}

	// verify

	fmt.Println()

	const printAmount = 4

	err = db.View(func(tx *bbolt.Tx) error {
		usersBucket := tx.Bucket([]byte("users"))
		userImagesBucket := tx.Bucket([]byte("userImages"))

		i := 0
		err = usersBucket.ForEach(func(k, v []byte) error {
			defer func() {
				i++
			}()
			if i >= 4 {
				return nil
			}

			userDiag, err := cbor.Diagnose(v)
			if err != nil {
				return err
			}

			fmt.Println("user: " + uuid.UUID(k).String())
			fmt.Println(userDiag)

			userImage := userImagesBucket.Get(k)
			if len(userImage) > 0 {
				fmt.Printf("has image %d bytes\n", len(userImage))
				fmt.Println("source id: " + uuid.UUID(userImagesBucket.Get(
					slices.Concat(k, []byte(":id")),
				)).String())
			} else {
				fmt.Println("does not have image")
			}

			fmt.Println()

			return nil
		})
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		panic(err)
	}
}
