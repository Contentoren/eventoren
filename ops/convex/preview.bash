#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
COMMAND="${1:-}"

environment_value() {
  local file="$1" key="$2" line
  while IFS= read -r line || [[ -n "$line" ]]; do
    line="${line#export }"
    if [[ "$line" == "$key="* ]]; then
      printf '%s' "${line#*=}"
      return 0
    fi
  done <"$file"
}

preview_environment_guard() {
  local preview_file="$SCRIPT_DIR/../../.env.development"
  local production_file="$SCRIPT_DIR/../../.env.production"
  [[ -f "$preview_file" && -f "$production_file" ]] || return 0
  for key in CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY; do
    local preview_value production_value
    preview_value="$(environment_value "$preview_file" "$key")"
    production_value="$(environment_value "$production_file" "$key")"
    if [[ -n "$preview_value" && "$preview_value" == "$production_value" ]]; then
      echo "error: development Convex configuration must not reuse the production $key" >&2
      exit 1
    fi
  done
}

preview_environment_guard
case "$COMMAND" in
  provision)
    bash "$SCRIPT_DIR/preview-install.bash"
    exec bash "$SCRIPT_DIR/preview-register.bash"
    ;;
  deploy) exec bash "$SCRIPT_DIR/../deploy.sh" development ;;
  env) exec bash "$SCRIPT_DIR/env_update.bash" development ;;
  *)
    echo "Usage: $0 <provision|deploy|env>" >&2
    exit 1
    ;;
esac
