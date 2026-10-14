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

# Bash read would silently discard NUL bytes before framing the selected values.
if IFS= read -r -d '' nul_prefix <"$ENV_FILE"; then
  echo "error: Environment file contains unsupported NUL bytes" >&2
  exit 1
fi
unset nul_prefix

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
  case "$key" in
    CONVEX_DEPLOY_KEY|CONVEX_DEPLOYMENT_TOKEN|CONVEX_DEPLOYMENT|CONVEX_URL|PUBLIC_CONVEX_URL|NEXT_PUBLIC_CONVEX_URL|VITE_CONVEX_URL|REACT_APP_CONVEX_URL|EXPO_PUBLIC_CONVEX_URL|PUBLIC_CONVEX_SITE_URL|NEXT_PUBLIC_CONVEX_SITE_URL|VITE_CONVEX_SITE_URL|REACT_APP_CONVEX_SITE_URL|EXPO_PUBLIC_CONVEX_SITE_URL) continue ;;
  esac

  if [[ "$value" == \"* && "$value" == *\" ]]; then
    value="${value:1:${#value}-2}"
  elif [[ "$value" == \'* && "$value" == *\' ]]; then
    value="${value:1:${#value}-2}"
  fi

  KEYS+=("$key")
  VALUES+=("$value")
done <"$ENV_FILE"

if [[ "$ENV_NAME" == "production" ]]; then
  ASSETS_CLI_ENV_FILE="${ASSETS_CLI_ENV_FILE:-$HOME/.config/project-creator/assets/eventoren/assets-cli.env}"
  if [[ ! -f "$ASSETS_CLI_ENV_FILE" ]]; then
    echo "error: assets-service CLI credentials are required to sync production image forwarding" >&2
    exit 3
  fi

  # The assets CLI config is private and already has the approved service identity.
  # Its project ID is a CLI selector, so resolve the service UUID from the authenticated API.
  # Keep source outside conditionals so errexit applies to every config command.
  exec {ASSETS_CONFIG_ERROR_FD}>&2
  trap 'echo "error: unable to load assets-service CLI config" >&"$ASSETS_CONFIG_ERROR_FD"; exit 3' ERR
  source "$ASSETS_CLI_ENV_FILE" >/dev/null 2>&1
  trap - ERR
  exec {ASSETS_CONFIG_ERROR_FD}>&-
  unset ASSETS_CONFIG_ERROR_FD
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
  ' 2>/dev/null)" || {
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
    # Derived production values retain precedence over local assignments.
    KEYS+=("$key")
    VALUES+=("$value")
  done
fi

if [[ "${#KEYS[@]}" -eq 0 ]]; then
  echo "Convex env sync complete (0 variables)"
  exit 0
fi

umask 077
UPLOAD_FILE="$(mktemp "${TMPDIR:-/tmp}/convex-env.XXXXXX")"
trap 'rm -f -- "$UPLOAD_FILE"' EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# Keep the existing parser's strings; send values only over stdin, never argv.
for index in "${!KEYS[@]}"; do
  printf '%s\0%s\0' "${KEYS[$index]}" "${VALUES[$index]}"
done | bun "$SCRIPT_DIR/envPayloadEncode.ts" >"$UPLOAD_FILE"

if bun convex env set --force --from-file "$UPLOAD_FILE" --env-file="$ENV_FILE" >/dev/null 2>&1; then
  echo "Convex env sync complete (${#KEYS[@]} assignments)"
else
  status=$?
  echo "error: Convex env sync failed" >&2
  exit "$status"
fi
