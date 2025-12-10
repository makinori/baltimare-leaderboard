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
// 	expireUserInfo = time.Hour * 24
// )

func everyMinute() {
	onlineUUIDs := lsl.GetOnlineUUIDs()

	for i := range onlineUUIDs {
		user, err, _ := database.GetUser(onlineUUIDs[i])
		if err != nil {
			slog.Error("update user failed", "err", err)
			continue
		}

		// dont need to branch if found as user will be empty

		user.Minutes++
		user.LastSeen = time.Now()
		// user.Info = getInfo()

		err = database.PutUser(onlineUUIDs[i], user)
		if err != nil {
			slog.Error("update user failed", "err", err)
			continue
		}
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
