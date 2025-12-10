package http

import (
	"embed"
	"io/fs"
	"log/slog"
	"net/http"
	"time"

	"github.com/makinori/baltimare-leaderboard/env"
	"github.com/makinori/foxlib/foxcss"
	"github.com/makinori/foxlib/foxhttp"
)

var (
	//go:embed assets
	embedFS embed.FS
)

func handleIndex(w http.ResponseWriter, r *http.Request) {
	foxhttp.ServeOptimized(
		w, r, ".html", time.Unix(0, 0), []byte(renderPage()), false,
	)
}

// sets up routes
func Init() {
	assetsFS, err := fs.Sub(embedFS, "assets")
	if err != nil {
		panic(err)
	}

	err = foxcss.InitSCSS(nil)
	if err != nil {
		panic(err)
	}

	initAPI()

	http.HandleFunc("GET /{$}", handleIndex)

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
