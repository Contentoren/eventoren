#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "development" && "$ENV_NAME" != "production" ]]; then
  echo "Usage: $0 <development|production>" >&2
  exit 1
fi

ENV_FILE="$REPO_DIR/.env.$ENV_NAME"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE is required; copy .env.$ENV_NAME.example and fill in $ENV_NAME values" >&2
  exit 1
fi

required_env_value() {
  local key="$1"
  if ! grep -Eq "^[[:space:]]*(export[[:space:]]+)?${key}[[:space:]]*=[[:space:]]*[^[:space:]#]" "$ENV_FILE"; then
    echo "error: $ENV_FILE must define a non-empty $key" >&2
    exit 1
  fi
}

required_env_value CONVEX_SELF_HOSTED_URL
required_env_value CONVEX_SELF_HOSTED_ADMIN_KEY

if [[ "$ENV_NAME" == "production" ]]; then
  # Keep the proof-signing key identical across the Pages app and Convex.
  # Both scripts load only the canonical .env.production; never pass the value
  # through argv or print it. Fail the deploy if either sync cannot complete.
  required_env_value AUTH_SECRET
  echo "Synchronizing production runtime secrets from .env.production"
  bash "$SCRIPT_DIR/convex/pages_origin_sync.bash" production
  bash "$SCRIPT_DIR/convex/env_update.bash" production
fi

cd "$REPO_DIR"
echo "Deploying Convex backend functions to the configured self-hosted $ENV_NAME instance"
bun convex deploy --typecheck disable --env-file="$ENV_FILE"

echo "Self-hosted Convex $ENV_NAME function deployment complete"
