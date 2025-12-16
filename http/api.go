package http

import (
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/baltimare-leaderboard/lsl"
	"github.com/makinori/baltimare-leaderboard/user"
	"github.com/makinori/foxlib/foxhttp"
)

func handleAPI(w http.ResponseWriter, r *http.Request) {
	// a socket.io endpoint with events: users (gzip), online (gzip), health
	// ^ uh yeah we'll see about that one

	out := []byte(strings.Join([]string{
		"GET /api/health - for monitoring",
		"",
		"GET /api/users - data for leaderboard, refreshes once a minute",
		"GET /api/users/online - output from in-world lsl cube, updates every " +
			strconv.Itoa(lsl.ScriptIntervalSeconds) + " seconds",
		"",
		"GET /api/user/{id}/image - get image for user or return default",
		"",
		"PUT /api/lsl/{where} - for the in-world lsl cube to send data to",
	}, "\n"))

	foxhttp.ServeOptimized(w, r, ".txt", time.Unix(0, 0), out, false)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	healthy, online := lsl.GetHealth()
	out, err := json.Marshal(map[string]any{
		"healthy": healthy,
		"online":  online,
	})

	if err != nil {
		slog.Error("failed to marshal json", "err", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to marshal json"))
		return
	}

	foxhttp.ServeOptimized(w, r, ".json", time.Unix(0, 0), out, false)
}

type APIUser struct {
	user.UserWithID
	Traits []string `json:"traits"`
}

func handleUsers(w http.ResponseWriter, r *http.Request) {
	users, err := user.GetUsers()
	if err != nil {
		slog.Error("failed to get users", "err", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to get users"))
		return
	}

	sort.Slice(users, func(i, j int) bool {
		return users[i].Minutes > users[j].Minutes
	})

	var apiUsers []APIUser

	for i := range users {
		apiUsers = append(apiUsers, APIUser{
			UserWithID: users[i],
			Traits:     uuidTraitMap[users[i].ID],
		})
	}

	data, err := json.Marshal(apiUsers)
	if err != nil {
		slog.Error("failed to marshal data", "err", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to marshal data"))
		return
	}

	foxhttp.ServeOptimized(w, r, ".json", time.Unix(0, 0), data, false)
}

type APIOnlineUser struct {
	ID     string `json:"id"`
	Region string `json:"region"`
	X      int    `json:"x"`
	Y      int    `json:"y"`
}

func handleUsersOnline(w http.ResponseWriter, r *http.Request) {
	// duplicates possible between regions
	online := lsl.GetData()

	apiOnlineUsers := []APIOnlineUser{}

	for region, onlineUsers := range online {
		for i := range onlineUsers {
			apiOnlineUsers = append(apiOnlineUsers, APIOnlineUser{
				ID:     onlineUsers[i].UUID.String(),
				Region: region,
				X:      onlineUsers[i].X,
				Y:      onlineUsers[i].Y,
			})
		}
	}

	out, err := json.Marshal(apiOnlineUsers)
	if err != nil {
		slog.Error("failed to marshal data", "err", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to marshal json"))
		return
	}

	foxhttp.ServeOptimized(w, r, ".json", time.Unix(0, 0), out, false)
}

func handleUserImage(w http.ResponseWriter, r *http.Request) {
	idStr := r.PathValue("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("invalid uuid"))
		return
	}

	userImage := user.GetUserImage(id)
	if len(userImage) > 0 {
		foxhttp.ServeOptimized(w, r, ".jpg", time.Unix(0, 0), userImage, true)
		return
	}

	http.Redirect(
		w, r, "/avatars/anon-avatar.png", http.StatusTemporaryRedirect,
	)
}

func handleLSLRegion(w http.ResponseWriter, r *http.Request) {
	auth := r.Header.Get("Authorization")
	if auth != "Bearer "+env.SECRET {
		w.WriteHeader(http.StatusUnauthorized)
		w.Write([]byte("wrong secret"))
		return
	}

	region := r.PathValue("region")
	if !slices.Contains(env.REGIONS, region) {
		slog.Warn("got unknown", "region", region)
		w.WriteHeader(http.StatusBadRequest)
		w.Write([]byte("unknown region"))
		return
	}

	data, err := io.ReadAll(r.Body)
	if err != nil {
		slog.Error("failed to read body", "err", err)
		w.WriteHeader(http.StatusInternalServerError)
		w.Write([]byte("failed to read body"))
		return
	}

	lsl.PutData(region, string(data))

	foxhttp.ServeOptimized(
		w, r, ".json", time.Unix(0, 0), []byte(`{"success":true}`), false,
	)
}

func initAPI() {
	http.HandleFunc("GET /api", handleAPI)
	http.HandleFunc("GET /api/health", handleHealth)
	http.HandleFunc("GET /api/users", handleUsers)
	http.HandleFunc("GET /api/users/online", handleUsersOnline)
	http.HandleFunc("GET /api/user/{id}/image", handleUserImage)
	http.HandleFunc("PUT /api/lsl/{region}", handleLSLRegion)
}
