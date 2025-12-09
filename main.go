package main

import (
	"fmt"
	"net/http"
	"slices"
	"sort"
	"time"

	"github.com/makinori/foxlib/foxcss"
	"github.com/makinori/foxlib/foxhttp"
)

// TODO: add auto backup system too

var (
	tempStaticUsers []UserWithID
)

func handlePage(w http.ResponseWriter, r *http.Request) {
	foxhttp.ServeOptimized(
		w, r, ".html", time.Unix(0, 0), []byte(renderPage()), false,
	)
}

func main() {
	err := foxcss.InitSCSS(nil)
	if err != nil {
		panic(err)
	}

	InitDatabase()
	defer db.Close()

	users, err := GetUsers()
	if err != nil {
		panic(err)
	}

	for i := range users {
		if users[i].User.Minutes >= 120 &&
			!slices.Contains(traitMap["bot"], users[i].ID.String()) {
			tempStaticUsers = append(tempStaticUsers, users[i])
		}
	}

	sort.Slice(tempStaticUsers, func(i, j int) bool {
		return tempStaticUsers[i].User.Minutes > tempStaticUsers[j].User.Minutes
	})

	http.HandleFunc("GET /", handlePage)

	fmt.Println("listening on :" + ENV_PORT)

	http.ListenAndServe("0.0.0.0:"+ENV_PORT, nil)
}
