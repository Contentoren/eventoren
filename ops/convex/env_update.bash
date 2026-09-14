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

echo "Convex env sync complete (${#KEYS[@]} variables)"
