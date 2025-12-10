default:
	@just --list

alias s := start
[group("dev")]
start:
	DEV=1 \
	GOEXPERIMENT=greenteagc \
	DATABASE_PATH=data/data.db \
	go run .

alias u := update
# git pull, build and restart quadlet
[group("server")]
update:
	git pull
	systemctl --user daemon-reload
	systemctl --user start baltimare-leaderboard-build
	systemctl --user restart baltimare-leaderboard-pod

# 2025 dec 9
[group("migration")]
migrate-from-js old_path new_path:
	deno run -A cmd/migrate-from-js/nedb-to-json.ts \
	"{{old_path}}" "{{old_path}}.json"
	go run -C cmd/migrate-from-js . \
	"$(realpath '{{old_path}}.json')" \
	"$(realpath '{{new_path}}')"

[group("dev")]
favicon input output:
	#!/bin/bash
	set -euo pipefail
	TMP=$(mktemp -u tmp.XXXXXX)
	rm -rf $TMP
	mkdir $TMP
	for size in 16 32 48 64; do
		magick "{{input}}" -filter Lanczos2 -resize ${size}x${size}\> \
		-background none -gravity center -extent ${size}x${size} \
		$TMP/${size}.bmp
	done
	magick $TMP/*.bmp {{output}}
	rm -rf $TMP

[group("dev")]
emulate-lsl:
	#!/bin/bash
	set -euo pipefail
	while true; do
	curl -X PUT -H "Authorization: Bearer supersecretchangeme" \
	-d "b7c5f3667a3942898157d3a8ae6d57f40,0" \
	http://127.0.0.1:8080/api/lsl/baltimare || true
	sleep 5
	done