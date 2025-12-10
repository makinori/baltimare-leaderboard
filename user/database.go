package user

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

// json tag is interusable for when we want to serialize for http
// however keys arent being used in database because of cbor toarray

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

type UserWithID struct {
	ID uuid.UUID `json:"id"`
	User
}

func InitDatabase() *bbolt.DB {
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

func getUser(id uuid.UUID) (User, error, bool) {
	var user User
	found := false

	err := db.View(func(tx *bbolt.Tx) error {
		usersBucket := tx.Bucket([]byte("users"))
		if usersBucket == nil {
			panic("users bucket not found")
		}

		data := usersBucket.Get(id[:])
		if len(data) == 0 {
			return nil
		}

		err := cbor.Unmarshal(data, &user)
		if err != nil {
			slog.Error("failed to unmarshal", "user", data)
			return err
		}

		return nil
	})

	return user, err, found
}

func putUser(id uuid.UUID, user User) error {
	return db.Update(func(tx *bbolt.Tx) error {
		usersBucket := tx.Bucket([]byte("users"))
		if usersBucket == nil {
			panic("users bucket not found")
		}

		data, err := cbor.Marshal(user)
		if err != nil {
			slog.Error("failed to marshal", "user", data)
			return err
		}

		return usersBucket.Put(id[:], data)
	})
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
