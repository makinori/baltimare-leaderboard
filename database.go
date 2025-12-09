package main

import (
	"errors"
	"log/slog"
	"time"

	"github.com/fxamacker/cbor/v2"
	"github.com/google/uuid"
	"go.etcd.io/bbolt"
)

var (
	db *bbolt.DB

	ErrorUserNotFound = errors.New("user not found")
)

type UserInfo struct {
	_           struct{}  `cbor:",toarray"`
	LastUpdated time.Time `cbor:"lastUpdated"`
	Username    string    `cbor:"username"`
	DisplayName string    `cbor:"displayName"`
	ImageID     uuid.UUID `cbor:"imageID"`
}

type User struct {
	_        struct{}  `cbor:",toarray"`
	Minutes  uint64    `cbor:"minutes"`
	LastSeen time.Time `cbor:"lastSeen"`
	Info     UserInfo  `cbor:"info"`
}

type UserWithID struct {
	ID   uuid.UUID
	User User
}

func InitDatabase() {
	if ENV_DATABASE_PATH == "" {
		panic("DATABASE_PATH not set")
	}

	var err error
	db, err = bbolt.Open(ENV_DATABASE_PATH, 0600, nil)
	if err != nil {
		panic(err)
	}

	err = db.Update(func(tx *bbolt.Tx) error {
		_, err = tx.CreateBucketIfNotExists([]byte("users"))
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		panic(err)
	}
}

func getUser(
	key uuid.UUID, usersBucket *bbolt.Bucket, usersInfoBucket *bbolt.Bucket,
) (User, UserInfo, error) {
	var user User
	var userInfo UserInfo

	userBytes := usersBucket.Get(key[:])
	if len(userBytes) == 0 {
		return user, userInfo, ErrorUserNotFound
	}

	err := cbor.Unmarshal(userBytes, &user)
	if err != nil {
		return user, userInfo, err
	}

	// its ok if user info fails cause we periodically fetch this anyway

	userInfoBytes := usersInfoBucket.Get(key[:])
	if len(userInfoBytes) > 0 {
		cbor.Unmarshal(userInfoBytes, &userInfo)
	}

	return user, userInfo, nil
}

func GetUsers() ([]UserWithID, error) {
	// TODO: keep cached in memory for faster rendering. or keep html cached??

	var users []UserWithID

	err := db.View(func(tx *bbolt.Tx) error {
		usersBucket := tx.Bucket([]byte("users"))
		if usersBucket == nil {
			panic("users bucket not found")
		}

		c := usersBucket.Cursor()

		for k, v := c.First(); k != nil; k, v = c.Next() {
			var user UserWithID

			if len(k) != 16 {
				slog.Error("invalid uuid", "uuid", k)
			}

			var err error
			user.ID = uuid.UUID(k)

			err = cbor.Unmarshal(v, &user.User)
			if err != nil {
				slog.Error("failed to parse", "user", v)
				continue
			}

			users = append(users, user)
		}

		return nil
	})

	return users, err
}
