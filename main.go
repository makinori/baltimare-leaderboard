package main

import (
	"github.com/makinori/baltimare-leaderboard/database"
	"github.com/makinori/baltimare-leaderboard/http"
	"github.com/makinori/baltimare-leaderboard/lsl"
)

// TODO: add auto backup system too

func main() {
	db := database.Init()
	defer db.Close()

	go lsl.Init()

	http.Init()
}
