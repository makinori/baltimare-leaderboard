default:
	@just --list

# 2025 dec 9
[group("migration")]
migrate-from-js old_path new_path:
	deno run -A cmd/migrate-from-js/nedb-to-json.ts \
	"{{old_path}}" "{{old_path}}.json"
	go run -C cmd/migrate-from-js . \
	"$(realpath '{{old_path}}.json')" \
	"$(realpath '{{new_path}}')"