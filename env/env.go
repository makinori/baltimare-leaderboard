package env

import (
	"log/slog"
	"os"
)

var (
	DATABASE_PATH = getEnv("DATABASE_PATH", "")

	PORT = getEnv("PORT", "8080")

	AREA    = getEnv("AREA", "baltimare")
	REGIONS []string

	SECRET = getEnv("SECRET", "supersecretchangeme")

	_, DEV = os.LookupEnv("DEV")
)

func init() {
	if DEV {
		slog.Warn("RUNNING IN DEVELOPER MODE")
	}

	if DATABASE_PATH == "" {
		panic("DATABASE_PATH not set")
	}

	switch AREA {
	case "baltimare":
		REGIONS = []string{"baltimare", "horseheights"}
	case "cloudsdale":
		REGIONS = []string{"cloudsdale", "clouddistrict"}
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
