package main

import (
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/fxamacker/cbor/v2"
	"github.com/google/uuid"
	bolt "go.etcd.io/bbolt"
)

type User struct {
	ID       string    `json:"_id"`
	Minutes  uint64    `json:"minutes"`
	LastSeen time.Time `json:"lastSeen"`
	Info     struct {
		LastUpdated time.Time `json:"lastUpdated"`
		Username    string    `json:"username"`
		DisplayName string    `json:"displayName"`
		ImageID     string    `json:"imageId"`
	} `json:"info"`
}

type NewUserInfo struct {
	_           struct{}  `cbor:",toarray"`
	LastUpdated time.Time `cbor:"lastUpdated"`
	Username    string    `cbor:"username"`
	DisplayName string    `cbor:"displayName"`
	ImageID     uuid.UUID `cbor:"imageID"`
}

type NewUser struct {
	_        struct{}    `cbor:",toarray"`
	Minutes  uint64      `cbor:"minutes"`
	LastSeen time.Time   `cbor:"lastSeen"`
	Info     NewUserInfo `cbor:"info"`
}

var (
	added int
	users []User
)

func migrateUsersTx(tx *bolt.Tx) error {
	usersBucket, err := tx.CreateBucketIfNotExists([]byte("users"))
	if err != nil {
		return err
	}

	for _, user := range users {
		userID, err := uuid.Parse(user.ID)
		if err != nil {
			return err
		}

		if userID == uuid.Nil {
			fmt.Println("ignoring one because nil id")
			continue
		}

		var imageID uuid.UUID
		if user.Info.ImageID != "" {
			imageID, err = uuid.Parse(user.Info.ImageID)
			if err != nil {
				return err
			}
		}

		newUser := NewUser{
			Minutes:  user.Minutes,
			LastSeen: user.LastSeen,
			Info: NewUserInfo{
				LastUpdated: user.Info.LastUpdated,
				Username:    user.Info.Username,
				DisplayName: user.Info.DisplayName,
				ImageID:     imageID,
			},
		}

		newUserBytes, err := cbor.Marshal(newUser)
		if err != nil {
			return err
		}

		err = usersBucket.Put(userID[:], newUserBytes)
		if err != nil {
			return err
		}

		added++
	}

	return nil
}

func main() {
	if len(os.Args) < 3 {
		fmt.Println("usage: <json> <output path>")
		os.Exit(1)
	}

	jsonPath := os.Args[1]
	outputPath := os.Args[2]

	_, err := os.Stat(outputPath)
	if err == nil {
		panic("output db already exists")
	}

	jsonData, err := os.ReadFile(jsonPath)
	if err != nil {
		panic(err)
	}

	err = json.Unmarshal(jsonData, &users)
	if err != nil {
		panic(err)
	}

	db, err := bolt.Open(outputPath, 0600, nil)
	if err != nil {
		panic(err)
	}
	defer db.Close()

	err = db.Update(func(tx *bolt.Tx) error {
		return migrateUsersTx(tx)
	})
	if err != nil {
		panic(err)
	}

	fmt.Printf("written %d docs to %s\n", added, outputPath)
}
