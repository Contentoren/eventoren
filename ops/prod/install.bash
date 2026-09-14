#!/usr/bin/env bash
set -euo pipefail

PROJECT_SLUG="eventoren"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"
source "$HOME/.config/$PROJECT_SLUG/prodctl-ports.env"
: "${PRODCTL_PORT_CONVEX:?missing Convex port}"
: "${PRODCTL_PORT_API:?missing API port}"

config_dir="$HOME/.config/$PROJECT_SLUG"
env_file="$config_dir/convex-backend.env"
mkdir -p "$config_dir"

instance_secret=""
if [[ -f "$env_file" ]]; then
  instance_secret="$(awk -F= '$1 == "INSTANCE_SECRET" { print substr($0, index($0, "=") + 1) }' "$env_file" | tail -n 1)"
fi
if [[ -z "$instance_secret" ]]; then
  instance_secret="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
fi

umask 077
cat >"$env_file" <<EOF
CONVEX_CLOUD_ORIGIN=https://eventoren-convex.contentoren.de
CONVEX_SITE_ORIGIN=https://eventoren-api.contentoren.de
NEXT_PUBLIC_DEPLOYMENT_URL=https://eventoren-convex.contentoren.de
INSTANCE_NAME=production
INSTANCE_SECRET=$instance_secret
DISABLE_BEACON=true
EOF
chmod 600 "$env_file"

source_path="$REPO_DIR/ops/prod/podman/$PROJECT_SLUG-convex-backend.container.in"
destination_path="$REPO_DIR/ops/prod/podman/$PROJECT_SLUG-convex-backend.container"
python3 - "$source_path" "$destination_path" "$PRODCTL_PORT_CONVEX" "$PRODCTL_PORT_API" <<'PY'
from pathlib import Path
import sys

source, destination, convex_port, api_port = sys.argv[1:]
content = Path(source).read_text()
content = content.replace("@CONVEX_PORT@", convex_port).replace("@API_PORT@", api_port)
Path(destination).write_text(content)
PY
