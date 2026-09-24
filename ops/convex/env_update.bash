#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
ENV_NAME="${1:-}"
if [[ "$ENV_NAME" != "development" && "$ENV_NAME" != "production" ]]; then
  echo "Usage: $0 <development|production>" >&2
  exit 1
fi

ENV_FILE="$SCRIPT_DIR/../../.env.$ENV_NAME"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE was not found" >&2
  exit 2
fi

trim() {
  local value="$1"
  value="${value#"${value%%[![:space:]]*}"}"
  value="${value%"${value##*[![:space:]]}"}"
  printf '%s' "$value"
}

declare -a KEYS=()
declare -a VALUES=()
while IFS= read -r line || [[ -n "$line" ]]; do
  line="$(trim "$line")"
  [[ -z "$line" || "$line" == \#* || "$line" != *=* ]] && continue
  [[ "$line" == export\ * ]] && line="$(trim "${line#export }")"

  key="$(trim "${line%%=*}")"
  value="$(trim "${line#*=}")"
  [[ -z "$key" || ! "$key" =~ ^[A-Za-z_][A-Za-z0-9_]*$ ]] && continue
  [[ "$key" == CONVEX_SELF_HOSTED_* || "$key" == CONVEX_SITE_URL ]] && continue

  if [[ "$value" == \"* && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'* && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  KEYS+=("$key")
  VALUES+=("$value")
done <"$ENV_FILE"

for index in "${!KEYS[@]}"; do
  key="${KEYS[$index]}"
  echo "Setting Convex env var: $key"
  bun convex env set "$key" "${VALUES[$index]}" --env-file="$ENV_FILE" >/dev/null
done

if [[ "$ENV_NAME" == "production" ]]; then
  ASSETS_CLI_ENV_FILE="${ASSETS_CLI_ENV_FILE:-$HOME/.config/project-creator/assets/eventoren/assets-cli.env}"
  if [[ ! -f "$ASSETS_CLI_ENV_FILE" ]]; then
    echo "error: assets-service CLI credentials are required to sync production image forwarding" >&2
    exit 3
  fi

  # The assets CLI config is private and already has the approved service identity.
  # Its project ID is a CLI selector, so resolve the service UUID from the authenticated API.
  source "$ASSETS_CLI_ENV_FILE"
  if [[ -z "${ASSETS_API_URL:-}" || -z "${ASSETS_PROJECT:-}" || -z "${ASSETS_TOKEN:-}" || "${ASSETS_ENVIRONMENT:-}" != "production" ]]; then
    echo "error: assets-service CLI config must identify the production project and credential" >&2
    exit 3
  fi
  export ASSETS_API_URL ASSETS_PROJECT ASSETS_TOKEN ASSETS_ENVIRONMENT
  ASSETS_SERVICE_PROJECT_ID="$(bun -e '
    const base = process.env.ASSETS_API_URL.replace(/\/+$/, "")
    const token = process.env.ASSETS_TOKEN
    const project = process.env.ASSETS_PROJECT
    const response = await fetch(`${base}/api/v1/projects/${encodeURIComponent(project)}`, {
      headers: { authorization: `Bearer ${token}` },
    })
    if (!response.ok) process.exit(1)
    const body = await response.json()
    const id = body?.data?.id ?? body?.id
    if (body?.ok === false || typeof id !== "string" || !id) process.exit(1)
    process.stdout.write(id)
  ')" || {
    echo "error: unable to resolve the authenticated production assets-service project" >&2
    exit 3
  }

  ASSETS_SERVICE_API_URL="${ASSETS_API_URL%/}"
  ASSETS_SERVICE_ENVIRONMENT="$ASSETS_ENVIRONMENT"
  for key in ASSETS_SERVICE_API_URL ASSETS_SERVICE_PROJECT_ID ASSETS_SERVICE_ENVIRONMENT ASSETS_SERVICE_ACCESS_TOKEN; do
    case "$key" in
      ASSETS_SERVICE_API_URL) value="$ASSETS_SERVICE_API_URL" ;;
      ASSETS_SERVICE_PROJECT_ID) value="$ASSETS_SERVICE_PROJECT_ID" ;;
      ASSETS_SERVICE_ENVIRONMENT) value="$ASSETS_SERVICE_ENVIRONMENT" ;;
      ASSETS_SERVICE_ACCESS_TOKEN) value="$ASSETS_TOKEN" ;;
    esac
    echo "Setting Convex env var: $key"
    bun convex env set "$key" "$value" --env-file="$ENV_FILE" >/dev/null
  done
fi

echo "Convex env sync complete (${#KEYS[@]} variables)"
