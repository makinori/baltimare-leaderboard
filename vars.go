package main

import "os"

var (
	ENV_DATABASE_PATH = getEnv("DATABASE_PATH", "")

	ENV_PORT = getEnv("PORT", "8080")

	ENV_NAME = getEnv("NAME", "baltimare")
)

func getEnv(key string, fallback string) string {
	value, ok := os.LookupEnv(key)
	if !ok {
		return fallback
	}
	return value
}
