package user

import (
	"log/slog"
	"time"

	"github.com/makinori/baltimare-leaderboard/database"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/robfig/cron/v3"
)

// const (
// 	userInfoExpireTime = time.Hour * 24
// )

// func getInfo(uuid uuid.UUID) (database.UserInfo, error) {
// 	return database.UserInfo{
// 		Username:    "username test",
// 		DisplayName: "display name test",
// 		LastUpdated: time.Now(),
// 	}, nil
// }

func everyMinute() {
	now := time.Now()
	onlineUUIDs := lsl.GetOnlineUUIDs()

	var gotFreshFor []string

	for i := range onlineUUIDs {
		user, err, _ := database.GetUser(onlineUUIDs[i])
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

		// if user.Info.LastUpdated.Add(userInfoExpireTime).Before(now) {
		// 	// get fresh
		// 	newInfo, err := getInfo(onlineUUIDs[i])
		// 	if err != nil {
		// 		slog.Error(
		// 			"failed to get user info. will still track",
		// 			"uuid", onlineUUIDs[i],
		// 			"err", err,
		// 		)
		// 	} else {
		// 		user.Info = newInfo
		// 		gotFreshFor = append(gotFreshFor, user.Info.Username)
		// 	}
		// }

		err = database.PutUser(onlineUUIDs[i], user)
		if err != nil {
			slog.Error("update user failed", "err", err)
			continue
		}
	}

	if len(gotFreshFor) > 0 {
		slog.Info("got fresh for", "users", gotFreshFor)
	}
}

func Init(cron *cron.Cron) {
	var err error
	if env.DEV {
		// once a second for testing
		_, err = cron.AddFunc("*/1 * * * * *", everyMinute)
	} else {
		_, err = cron.AddFunc("0 * * * * *", everyMinute)
	}

	if err != nil {
		panic(err)
	}

	slog.Info("started user interval cron")
}
