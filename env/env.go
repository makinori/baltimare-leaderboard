package env

import (
	"log/slog"
	"os"

	"git.ran.cafe/maki/foxlib/foxhttp"
)

var (
	DATABASE_PATH = getEnv("DATABASE_PATH", "")

	PORT = getEnv("PORT", "8080")

	AREA = getEnv("AREA", "baltimare")
	// in order from left to right
	REGIONS []string

	SECRET = getEnv("SECRET", "supersecretchangeme")

	_, DEV = os.LookupEnv("DEV")
)

func init() {
	if DEV {
		slog.Warn("RUNNING IN DEVELOPER MODE")
		slog.SetLogLoggerLevel(slog.LevelDebug)
		foxhttp.DisableContentEncodingForHTML = true
		foxhttp.ReportWarnings = true
	}

	if DATABASE_PATH == "" {
		panic("DATABASE_PATH not set")
	}

	switch AREA {
	case "baltimare":
		REGIONS = []string{"horseheights", "baltimare"}
	case "cloudsdale":
		REGIONS = []string{"clouddistrict", "cloudsdale"}
	default:
		panic("unknown area: " + AREA)
	}
}

func getEnv(key string, fallback string) string {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	return value
}
