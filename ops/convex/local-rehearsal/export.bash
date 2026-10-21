#!/usr/bin/env bash
set -euo pipefail

# Fail-closed: never inherit a deployment selection from the operator shell.
# Production credentials come only from the explicit private --prod-env file.
unset CONVEX_DEPLOYMENT CONVEX_DEPLOY_KEY CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY 2>/dev/null || true
for inherited in $(compgen -e | grep '^CONVEX_' || true); do unset "$inherited"; done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
STATE_ROOT="${LOCAL_REHEARSAL_STATE_ROOT:-$HOME/.local/state/eventoren/local-rehearsal}"
SNAPSHOT_DIR="$STATE_ROOT/snapshots"

usage() {
  cat <<'EOF'
Usage:
  export.bash --help
  export.bash --verify-flags
  export.bash --path <snapshot.zip|dir> --prod-env <private-production-env-file> [--include-file-storage]

Read-only production export for local migration rehearsal.
  - Never writes to production: only `convex export` (snapshot read) is invoked.
  - Never deploys, runs, mutates, or cleans production.
  - Production credentials come only from an explicit private --prod-env file
    outside git; nothing is read from the worktree.
  - Snapshot lands under the private state root; secrets/PII are never printed.

Examples:
  export.bash --verify-flags
  export.bash --path "$HOME/.local/state/eventoren/local-rehearsal/snapshots/prod-20261020.zip" --prod-env "$HOME/.config/eventoren/prod-export.env"
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then usage; exit 0; fi
if [[ "${1:-}" == "--verify-flags" ]]; then
  echo "convex CLI export surface (read-only; no deploy/run/mutation):"
  bunx convex export --help
  exit 0
fi

PATH_OUT=""
PROD_ENV=""
INCLUDE_STORAGE=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) PATH_OUT="${2:-}"; shift 2 ;;
    --prod-env) PROD_ENV="${2:-}"; shift 2 ;;
    --include-file-storage) INCLUDE_STORAGE=(--include-file-storage); shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "error: unknown argument $1" >&2; usage >&2; exit 1 ;;
  esac
done

[[ -n "$PATH_OUT" && -n "$PROD_ENV" ]] || { echo "error: --path and --prod-env are required" >&2; usage >&2; exit 1; }
[[ -f "$PROD_ENV" ]] || { echo "error: production env file not found (private path outside git required)" >&2; exit 1; }
if [[ "$PROD_ENV" == "$SCRIPT_DIR"* || "$PROD_ENV" == *"eventoren"*"/feature-veranstalter-dashboard"* ]]; then
  echo "error: production env must live outside the worktree" >&2; exit 1
fi
case "$PATH_OUT" in
  "$STATE_ROOT"/*) ;;
  *) echo "error: snapshot path must stay under the private state root $STATE_ROOT" >&2; exit 1 ;;
esac
if grep -Eq '^[[:space:]]*(export[[:space:]]+)?CONVEX_SELF_HOSTED_URL[[:space:]]*=' "$PROD_ENV"; then :; else
  echo "error: production env file must define CONVEX_SELF_HOSTED_URL" >&2; exit 1
fi

mkdir -p "$SNAPSHOT_DIR"
echo "read-only export: convex export --env-file <private-prod-env> --path <private-snapshot>"
echo "target_snapshot=$PATH_OUT"
if [[ -e "$PATH_OUT" ]]; then
  echo "error: refusing to overwrite existing snapshot path $PATH_OUT" >&2; exit 1
fi
cd "$SCRIPT_DIR/../../.."
bunx convex export --env-file "$PROD_ENV" --path "$PATH_OUT" "${INCLUDE_STORAGE[@]}"
echo "export complete (counts only; inspect with: unzip -l <snapshot> | tail)"
