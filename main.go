package main

import (
	"log/slog"

	"github.com/makinori/baltimare-leaderboard/database"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/http"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/robfig/cron/v3"
)

// TODO: add auto backup system too

func main() {
	if env.DEV {
		slog.Warn("RUNNING IN DEVELOPER MODE")
		slog.Warn("cron timers will be sped up and such")
	}

	db := database.Init()
	defer db.Close()

	c := cron.New(cron.WithSeconds())
	lsl.Init(c)
	user.Init(c)
	go c.Start()

	http.Init()
}
