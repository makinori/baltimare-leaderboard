default:
	@just --list

alias s := start
[group("dev")]
start:
	#!/bin/bash
	set -euo pipefail

	which air &> /dev/null || {
		echo "please go install github.com/air-verse/air@latest" >&2
		exit 1
	}

	DEV=1 PORT=1234 \
	DATABASE_PATH=data/data.db \
	GOEXPERIMENT=greenteagc \
	CI=true CLICOLOR_FORCE=1 \
	air \
	-proxy.enabled=true \
	-proxy.app_port=1234 \
	-proxy.proxy_port=8080 \
	-build.delay=10 \
	-build.include_ext go,html,css,scss,png,jpg,gif,svg,md \
	-build.exclude_dir cache,cmd,tmp

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
	curl -s -X PUT \
	-H "Content-Type: text/plain" \
	-H "Authorization: Bearer supersecretchangeme" \
	-d "b7c5f3667a3942898157d3a8ae6d57f432,32" \
	http://127.0.0.1:8080/api/lsl/baltimare > /dev/null || true
	sleep 5
	done