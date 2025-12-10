package main

import (
	"github.com/makinori/baltimare-leaderboard/http"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/robfig/cron/v3"
)

// TODO: add auto backup system too

func main() {
	db := user.InitDatabase()
	defer db.Close()

	c := cron.New(cron.WithSeconds())
	lsl.Init(c)
	user.InitCron(c)
	go c.Start()

	http.Init()
}
