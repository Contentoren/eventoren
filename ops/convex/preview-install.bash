#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"
PROJECT_SLUG="eventoren"
ENV_FILE="$SCRIPT_DIR/preview.env"
QUADLET_DIR="${XDG_CONFIG_HOME:-$HOME/.config}/containers/systemd"

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

CONVEX_PORT="${CONVEX_PREVIEW_PORT:-3222}"
API_PORT="${CONVEX_PREVIEW_API_PORT:-3223}"

command -v podman >/dev/null 2>&1 || { echo "error: podman is required" >&2; exit 1; }
mkdir -p "$QUADLET_DIR"

if [[ ! -f "$ENV_FILE" ]]; then
  umask 077
  instance_secret="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  cat >"$ENV_FILE" <<EOF
CONVEX_CLOUD_ORIGIN=https://eventoren-convex.leonardomora.de
CONVEX_SITE_ORIGIN=https://eventoren-api.leonardomora.de
NEXT_PUBLIC_DEPLOYMENT_URL=https://eventoren-convex.leonardomora.de
INSTANCE_NAME=development
INSTANCE_SECRET=$instance_secret
DISABLE_BEACON=true
CONVEX_PREVIEW_PORT=$CONVEX_PORT
CONVEX_PREVIEW_API_PORT=$API_PORT
EOF
  chmod 600 "$ENV_FILE"
fi

# The checked-out preview.env is the durable source of port configuration.
# Shell overrides remain useful when provisioning a new host, but a normal
# reinstall must not silently render the fallback ports over existing routes.
CONVEX_PORT="${CONVEX_PREVIEW_PORT:-$(environment_value "$ENV_FILE" CONVEX_PREVIEW_PORT)}"
API_PORT="${CONVEX_PREVIEW_API_PORT:-$(environment_value "$ENV_FILE" CONVEX_PREVIEW_API_PORT)}"
: "${CONVEX_PORT:=3222}"
: "${API_PORT:=3223}"

python3 - "$SCRIPT_DIR/preview.container.in" "$QUADLET_DIR/$PROJECT_SLUG-convex-preview.container" "$ENV_FILE" "$CONVEX_PORT" "$API_PORT" <<'PY'
from pathlib import Path
import sys

source, destination, env_file, convex_port, api_port = sys.argv[1:]
content = Path(source).read_text()
content = content.replace("@ENV_FILE@", env_file).replace("@CONVEX_PORT@", convex_port).replace("@API_PORT@", api_port)
Path(destination).write_text(content)
PY

ln -sfn "$SCRIPT_DIR/preview-data.volume" "$QUADLET_DIR/$PROJECT_SLUG-convex-preview-data.volume"
chmod 600 "$ENV_FILE"
systemctl --user daemon-reload
systemctl --user reset-failed "$PROJECT_SLUG-convex-preview.service" 2>/dev/null || true
systemctl --user restart "$PROJECT_SLUG-convex-preview.service"

for _ in $(seq 1 36); do
  if curl -fsS --max-time 5 "http://127.0.0.1:$CONVEX_PORT/version" >/dev/null; then
    echo "Preview Convex infrastructure is healthy on 127.0.0.1:$CONVEX_PORT/$API_PORT"
    exit 0
  fi
  sleep 5
done

systemctl --user --no-pager status "$PROJECT_SLUG-convex-preview.service" || true
exit 1
