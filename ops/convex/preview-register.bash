#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ENV_FILE="$SCRIPT_DIR/preview.env"

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

CONVEX_PORT="${CONVEX_PREVIEW_PORT:-$(environment_value "$ENV_FILE" CONVEX_PREVIEW_PORT)}"
API_PORT="${CONVEX_PREVIEW_API_PORT:-$(environment_value "$ENV_FILE" CONVEX_PREVIEW_API_PORT)}"
: "${CONVEX_PORT:=3222}"
: "${API_PORT:=3223}"

command -v project-registry >/dev/null 2>&1 || { echo "error: project-registry is required" >&2; exit 1; }


REGISTRY_OWNER='leo'
REGISTRY_PROJECT_NAME='eventoren'
: "${REGISTRY_OWNER:?Project Registry owner is required}"
: "${REGISTRY_PROJECT_NAME:?Project Registry project name is required}"
REGISTRY_SOCKET="${PROJECT_REGISTRY_SOCKET:-/run/project-registry/$REGISTRY_OWNER.sock}"

# USER selects the configured API owner; the configured Unix socket provides
# authentication. Sibling services are preserved by the service-aware CLI edit.
registry_cli() {
  USER="$REGISTRY_OWNER" PROJECT_REGISTRY_SOCKET="$REGISTRY_SOCKET" project-registry "$@"
}

registry_cli project get "$REGISTRY_PROJECT_NAME" >/dev/null 2>&1 || {
  echo "error: main Project Registry project $REGISTRY_OWNER/$REGISTRY_PROJECT_NAME must exist" >&2
  exit 1
}

registry_project_edit() {
  local service="$1" port="$2" host="$3" output="" attempt
  for attempt in 1 2 3; do
    if output="$(registry_cli project edit "$REGISTRY_PROJECT_NAME" --service "$service" --port "$port" --domain "$host" --kind proxy --access external --ownership registry --no-docs --no-browse --enabled 2>&1)"; then
      printf '%s\n' "$output"
      return 0
    fi
    if [[ "$output" != *"revision mismatch"* &&
      "$output" != *"revision conflict"* &&
      "$output" != *"revision changed during mutation"* &&
      "$output" != *"stale revision"* ]]; then
      printf '%s\n' "$output" >&2
      return 1
    fi
    if [[ "$attempt" -eq 3 ]]; then
      printf '%s\n' "$output" >&2
      return 1
    fi
  done
}

registry_project_edit preview-convex "$CONVEX_PORT" "eventoren-convex.leonardomora.de"
registry_project_edit preview-api "$API_PORT" "eventoren-api.leonardomora.de"
echo "Project Registry grouped preview Convex services under $REGISTRY_OWNER/$REGISTRY_PROJECT_NAME"
