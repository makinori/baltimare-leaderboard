package database

import (
	"errors"
	"log/slog"
	"time"

	"github.com/fxamacker/cbor/v2"
	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/env"
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

func Init() *bbolt.DB {
	var err error
	db, err = bbolt.Open(env.DATABASE_PATH, 0600, nil)
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

	return db
}

func GetUsers() ([]UserWithID, error) {
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
