#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." >/dev/null 2>&1 && pwd)"
APP="eventoren"
WORK_DIR="$(mktemp -d)"
ARCHIVE="$WORK_DIR/$APP.tar"
MARKER="$WORK_DIR/.prodctl-sha"

cleanup() {
  rm -rf "$WORK_DIR"
}
trap cleanup EXIT

command -v ssh >/dev/null 2>&1 || { echo "error: ssh is required" >&2; exit 1; }
command -v tar >/dev/null 2>&1 || { echo "error: tar is required" >&2; exit 1; }
[[ -d "$REPO_DIR/ops/prod" ]] || { echo "error: $REPO_DIR/ops/prod is required" >&2; exit 1; }

# Archive the working tree, not Git history. Environment files and local
# runtime material are excluded explicitly because this wrapper also supports
# generated projects that have not been committed.
tar \
  --create \
  --file="$ARCHIVE" \
  --directory="$REPO_DIR" \
  --exclude-vcs \
  --exclude='.env' \
  --exclude='.env/*' \
  --exclude='.env.*' \
  --exclude='*.env' \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='out' \
  --exclude='build' \
  --exclude='coverage' \
  --exclude='.cache' \
  --exclude='.wrangler' \
  --exclude='.project-creator' \
  --exclude='data' \
  --exclude='*.pem' \
  --exclude='*.key' \
  --exclude='*.p12' \
  --exclude='*.pfx' \
  --exclude='*.sqlite' \
  --exclude='*.db' \
  --exclude='*.log' \
  --exclude='secrets' \
  --exclude='credentials' \
  .

release_marker="uncommitted"
if git -C "$REPO_DIR" rev-parse --verify HEAD >/dev/null 2>&1; then
  release_marker="$(git -C "$REPO_DIR" rev-parse HEAD)"
  if [[ -n "$(git -C "$REPO_DIR" status --porcelain)" ]]; then
    release_marker="$release_marker-dirty"
  fi
fi
printf '%s\n' "$release_marker" >"$MARKER"
tar --append --file="$ARCHIVE" --directory="$WORK_DIR" .prodctl-sha

# prodctl accepts the tar stream on the forced-command host. No remote shell
# command or local secret is sent with the artifact.
ssh -o BatchMode=yes -o IdentitiesOnly=yes contentoren-prodctl deploy "$APP" <"$ARCHIVE"
