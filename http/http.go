package http

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"time"

	"git.hotmilk.space/maki/foxlib/foxhttp"
	"github.com/makinori/baltimare-leaderboard/env"
)

var (
	//go:embed assets
	embedFS embed.FS
)

func handleRender(renderable func() (string, bool)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		startTime := time.Now()

		html, ok := renderable()
		if !ok {
			w.WriteHeader(http.StatusInternalServerError)
			w.Write([]byte(html))
			return
		}

		w.Header().Add(
			"X-Render-Time",
			formatShortDuration(time.Since(startTime)),
		)

		foxhttp.ServeOptimized(
			w, r, ".html", time.Unix(0, 0), []byte(html), false,
		)
	}
}

// sets up routes
func Init() {
	assetsFS, err := fs.Sub(embedFS, "assets")
	if err != nil {
		panic(err)
	}

	initAPI()

	http.HandleFunc("GET /{$}", handleRender(renderPage))

	http.HandleFunc("GET /hx/stats", handleRender(renderOnlyStats))
	http.HandleFunc("GET /hx/map", handleRender(renderOnlyMap))
	http.HandleFunc("GET /hx/users", handleRender(renderOnlyUsers))

	http.HandleFunc("GET /favicon.ico", func(w http.ResponseWriter, r *http.Request) {
		data, err := fs.ReadFile(assetsFS, "icons/favicon-"+env.AREA+".ico")
		if err != nil {
			slog.Error("failed to get favicon", "area", env.AREA)
			return
		}
		foxhttp.ServeOptimized(w, r, "favicon.ico", time.Unix(0, 0), data, true)
	})

	http.HandleFunc(
		"GET /{file...}",
		foxhttp.FileServerOptimized(assetsFS, http.NotFound),
	)

	slog.Info("listening on :" + env.PORT)
	http.ListenAndServe("0.0.0.0:"+env.PORT, nil)
}
