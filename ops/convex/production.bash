#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
COMMAND="${1:-}"
case "$COMMAND" in
  deploy) exec bash "$SCRIPT_DIR/../deploy.sh" production ;;
  env) exec bash "$SCRIPT_DIR/env_update.bash" production ;;
  *)
    echo "Usage: $0 <deploy|env>" >&2
    exit 1
    ;;
esac
