default:
	@just --list

alias s := start
[group("dev")]
start:
	GOEXPERIMENT=greenteagc \
	DATABASE_PATH=data/data.db \
	go run .

alias u := update
# git pull, build and restart quadlet
[group("server")]
update:
	git pull
	systemctl --user daemon-reload
	systemctl --user start maki.cafe-build
	systemctl --user restart maki.cafe

# 2025 dec 9
[group("migration")]
migrate-from-js old_path new_path:
	deno run -A cmd/migrate-from-js/nedb-to-json.ts \
	"{{old_path}}" "{{old_path}}.json"
	go run -C cmd/migrate-from-js . \
	"$(realpath '{{old_path}}.json')" \
	"$(realpath '{{new_path}}')"