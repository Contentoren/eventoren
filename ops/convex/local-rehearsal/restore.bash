#!/usr/bin/env bash
set -euo pipefail

# Fail-closed: never inherit a deployment selection from the operator shell.
# The import target comes only from cli.env after every guard below passes.
unset CONVEX_DEPLOYMENT CONVEX_DEPLOY_KEY CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY 2>/dev/null || true
for inherited in $(compgen -e | grep '^CONVEX_' || true); do unset "$inherited"; done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." >/dev/null 2>&1 && pwd)"
STATE_ROOT="${LOCAL_REHEARSAL_STATE_ROOT:-$HOME/.local/state/eventoren/local-rehearsal}"
CONVEX_PORT="${LOCAL_REHEARSAL_CONVEX_PORT:-13470}"
API_PORT="${LOCAL_REHEARSAL_API_PORT:-13471}"
CONTAINER_NAME="${LOCAL_REHEARSAL_CONTAINER:-eventoren-local-rehearsal}"
INSTANCE_NAME="eventoren-local-rehearsal"

# Namespace allowlist (mirrors bootstrap.bash): the container override must
# stay inside the rehearsal namespace before any podman call touches it.
case "$CONTAINER_NAME" in
  eventoren-local-rehearsal|eventoren-local-rehearsal-*) ;;
  *) echo "error: rehearsal container must stay in the eventoren-local-rehearsal namespace (got '$CONTAINER_NAME')" >&2; exit 1 ;;
esac

usage() {
  cat <<'EOF'
Usage:
  restore.bash --help
  restore.bash --path <private-snapshot.zip> [--replace-all] [--yes]

Restores a snapshot only into the isolated local rehearsal backend.
  - Runs bootstrap.bash verify first (internal network, sole network,
    loopback binds, pinned image, live identity, authenticated cli.env,
    side-effect-free backend env). Any failure refuses the restore.
  - Re-runs the TypeScript guards (loopback target, instance identity,
    snapshot path) and refuses on any failure.
  - Refuses snapshots outside the canonical private state root (realpath:
    no ../ traversal, no symlink escape, no world-readable file).
  - Refuses snapshots carrying file storage, scheduled jobs, crons, or
    system tables.
  - Restore target is always exactly http://127.0.0.1:$LOCAL_REHEARSAL_CONVEX_PORT.
  - Never touches preview/production ports or deployed services.
EOF
}

if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then usage; exit 0; fi

SNAPSHOT=""
REPLACE_ALL=()
CONFIRM=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    --path) SNAPSHOT="${2:-}"; shift 2 ;;
    --replace-all) REPLACE_ALL=(--replace-all); shift ;;
    --yes) CONFIRM=(-y); shift ;;
    --help|-h) usage; exit 0 ;;
    *) echo "error: unknown argument $1" >&2; usage >&2; exit 1 ;;
  esac
done

[[ -n "$SNAPSHOT" ]] || { echo "error: --path <snapshot> is required" >&2; usage >&2; exit 1; }

# Canonical private state root (no symlink escape).
[[ -d "$STATE_ROOT" ]] || { echo "error: private state root missing: $STATE_ROOT" >&2; exit 1; }
CANON_STATE="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$STATE_ROOT")"
case "$CANON_STATE" in
  "$HOME/.local/state/eventoren" | "$HOME/.local/state/eventoren"/*) ;;
  *) echo "error: state root escapes ~/.local/state/eventoren" >&2; exit 1 ;;
esac

# Canonical snapshot path: must exist, be a regular file, resolve under the
# canonical state root, and must not be readable by other users (PII-bearing).
[[ -e "$SNAPSHOT" ]] || { echo "error: snapshot not found: $SNAPSHOT" >&2; exit 1; }
[[ -f "$SNAPSHOT" && ! -L "$SNAPSHOT" ]] || { echo "error: snapshot must be a regular file, not a symlink" >&2; exit 1; }
CANON_SNAP="$(python3 -c 'import os,sys; print(os.path.realpath(sys.argv[1]))' "$SNAPSHOT")"
case "$CANON_SNAP" in
  "$CANON_STATE"/*) ;;
  *) echo "error: snapshot must live under the private state root $CANON_STATE" >&2; exit 1 ;;
esac
if [[ -n "$(find "$CANON_SNAP" -perm -o+r 2>/dev/null)" ]]; then
  echo "error: snapshot must not be readable by other users (chmod 600)" >&2
  exit 1
fi

# The full isolation gate lives in bootstrap verify. Restore never proceeds
# without a fresh pass: internal network, sole container network, loopback
# binds, pinned image, live backend identity, authenticated cli.env, and a
# side-effect-free backend env.
bash "$SCRIPT_DIR/bootstrap.bash" verify || {
  echo "error: rehearsal isolation verify failed; refusing restore" >&2
  exit 1
}

# Re-run the TypeScript guards against the live values (loopback target,
# instance identity from the backend, snapshot path). Any failure refuses.
TARGET_URL="http://127.0.0.1:$CONVEX_PORT"
LIVE_IDENTITY="$(podman exec "$CONTAINER_NAME" sh -c 'printf %s "$INSTANCE_NAME"' 2>/dev/null || true)"
GUARD_INPUT_TARGET_URL="$TARGET_URL" GUARD_INPUT_INSTANCE="$LIVE_IDENTITY" GUARD_INPUT_SNAP="$CANON_SNAP" GUARD_INPUT_ROOT="$CANON_STATE" \
  bun --cwd "$REPO_ROOT" -e '
import { localRehearsalLoopbackValidate } from "./scripts/localRehearsalLoopbackValidate.ts"
import { localRehearsalIdentityValidate } from "./scripts/localRehearsalIdentityValidate.ts"
import { localRehearsalSnapshotPathValidate } from "./scripts/localRehearsalSnapshotPathValidate.ts"
const target = localRehearsalLoopbackValidate(process.env.GUARD_INPUT_TARGET_URL ?? "")
if (!target.success) {
  console.error(`error: loopback guard refused target: ${target.errorMessage}`)
  process.exit(1)
}
const identity = localRehearsalIdentityValidate({
  instanceName: process.env.GUARD_INPUT_INSTANCE ?? "",
  expectedInstanceName: "eventoren-local-rehearsal",
})
if (!identity.success) {
  console.error(`error: identity guard refused backend: ${identity.errorMessage}`)
  process.exit(1)
}
const snap = localRehearsalSnapshotPathValidate({
  snapshotPath: process.env.GUARD_INPUT_SNAP ?? "",
  stateRoot: process.env.GUARD_INPUT_ROOT ?? "",
})
if (!snap.success) {
  console.error(`error: snapshot path guard refused: ${snap.errorMessage}`)
  process.exit(1)
}
console.log("guards=loopback+identity+snapshot-path ok")
' || exit 1

# cli.env must target exactly the local backend with a real (non-placeholder)
# admin key. The authenticated probe in bootstrap verify already proved the
# key; here the URL is re-pinned so a stale or edited cli.env cannot redirect.
CLI_ENV="$CANON_STATE/cli.env"
[[ -f "$CLI_ENV" ]] || { echo "error: rehearsal cli.env missing; rerun bootstrap.bash up" >&2; exit 1; }
CLI_URL="$(awk -F= '$1=="CONVEX_SELF_HOSTED_URL"{print $2}' "$CLI_ENV" | tail -n 1)"
[[ "$CLI_URL" == "$TARGET_URL" ]] || {
  echo "error: cli.env URL ($CLI_URL) is not exactly the local rehearsal target ($TARGET_URL)" >&2
  exit 1
}
if grep -Eq 'replace-with-local-rehearsal-admin-key|replace-' "$CLI_ENV"; then
  echo "error: cli.env carries a placeholder admin key; rerun bootstrap.bash up" >&2
  exit 1
fi

# Snapshot content gate (names only, never rows): data tables only. Refuse
# file storage, scheduled jobs, crons, and system tables before importing.
python3 - "$CANON_SNAP" <<'PY'
import sys, zipfile
snap = sys.argv[1]
try:
    names = zipfile.ZipFile(snap).namelist()
except Exception:
    print("error: snapshot is not a readable zip file", file=sys.stderr)
    raise SystemExit(1)
bad = [n for n in names
       if "/_storage/" in f"/{n}" or n.startswith("_storage/")
       or "schedul" in n.lower() or "cron" in n.lower()
       or n.startswith("_system/") or "/_system/" in f"/{n}"]
if bad:
    print(f"error: snapshot carries job/storage/system entries: {bad[:5]}", file=sys.stderr)
    raise SystemExit(1)
tables = sorted({n.split("/")[0] for n in names if "/" in n and not n.endswith("/")})
print(f"snapshot=tables:{len(tables)} entries:{len(names)}")
PY

echo "restore target validated: $TARGET_URL (identity $INSTANCE_NAME, loopback-only, guards green)"
(cd "$REPO_ROOT" && bunx convex import --env-file "$CLI_ENV" "$CANON_SNAP" "${REPLACE_ALL[@]}" "${CONFIRM[@]}")
echo "restore complete; verifying counts, IDs, full record fields, and table mappings (names and numbers only, no rows)"

# Post-restore verification on additive schema evolution: every
# snapshot-carried data table must restore with identical IDs AND identical
# full canonical record field hashes (not IDs alone). The prior strict
# table-set equality falsely failed a valid rollback (manual proof: 1250
# records across 33 data tables identical) because the backend legitimately
# carries two DECLARED-but-empty new tables plus their two _tables metadata
# rows. _tables mappings compare as original name->id pairs; extra mappings
# and extra tables pass only when explicitly allowlisted AND empty.
umask 077
VERIFY_DIR="$CANON_STATE/verify"
mkdir -p "$VERIFY_DIR"
chmod 700 "$VERIFY_DIR"
VERIFY_SNAP="$VERIFY_DIR/reexport-$(date -u +%Y%m%dT%H%M%SZ).zip"
(cd "$REPO_ROOT" && bunx convex export --env-file "$CLI_ENV" --path "$VERIFY_SNAP" >/dev/null)
chmod 600 "$VERIFY_SNAP"

# Explicit allowlist provenance: each name must be a table DECLARED in the
# current schema source (mirrored into the private staging copy). Anything
# else — a nonempty extra, an undeclared extra, a lost table, a changed
# record, or a renumbered mapping — fails the comparison.
EXTRA_TABLE_PROVENANCE=(
  "organizerDashboardAudit:src/organizer/dashboard/convex/organizerDashboardTables.ts"
  "organizerDashboardOrganizations:src/organizer/dashboard/convex/organizerDashboardTables.ts"
  "organizerDashboardPricingJobs:src/organizer/dashboard/convex/organizerDashboardTables.ts"
  "organizerDashboardTeamInvitations:src/organizer/dashboard/team/organizerDashboardTeamTables.ts"
  "organizerDashboardContractConsents:src/organizer/dashboard/contracts/organizerContractTables.ts"
  "organizerDashboardOrderNotes:src/organizer/dashboard/orders/convex/organizerDashboardOrderTables.ts"
  "organizerDashboardOrderAudit:src/organizer/dashboard/orders/convex/organizerDashboardOrderTables.ts"
)
ALLOW_EMPTY_EXTRA=()
for declaration in "${EXTRA_TABLE_PROVENANCE[@]}"; do
  extra="${declaration%%:*}"
  provenance="$REPO_ROOT/${declaration#*:}"
  grep -Eq "^  ${extra}: defineTable\\(" "$provenance" || {
    echo "error: allowlisted extra table is not declared in the schema provenance ($provenance): $extra" >&2
    exit 1
  }
  ALLOW_EMPTY_EXTRA+=("$extra")
done
COMPARE_ALLOW="$(IFS=,; echo "${ALLOW_EMPTY_EXTRA[*]}")"
COMPARE_ORIGINAL="$CANON_SNAP" COMPARE_REEXPORT="$VERIFY_SNAP" COMPARE_ALLOW="$COMPARE_ALLOW" COMPARE_SCRIPT="$REPO_ROOT/scripts/localRehearsalSnapshotCompare.py" \
bun --cwd "$REPO_ROOT" -e '
import { localRehearsalSnapshotCompare } from "./scripts/localRehearsalSnapshotCompare.ts"
const result = localRehearsalSnapshotCompare({
  originalZip: process.env.COMPARE_ORIGINAL ?? "",
  reexportZip: process.env.COMPARE_REEXPORT ?? "",
  allowedEmptyTables: (process.env.COMPARE_ALLOW ?? "").split(",").filter((name) => name !== ""),
  comparatorScript: process.env.COMPARE_SCRIPT ?? "",
})
if (!result.success) {
  console.error(`error: restore verification failed: ${result.errorMessage}`)
  process.exit(1)
}
const extra = result.data.allowedExtra.join(",") || "none"
console.log(`compare=tables:${result.data.tables} docs:${result.data.docs} allow_extra:${extra} ok`)
' || exit 1
echo "counts/IDs/fields/mappings verified; re-export kept private at $VERIFY_SNAP (chmod 600)"
echo "cron/scheduler check: rehearsal functions deploy with an empty cron registry (see stage-deploy.bash status),"
CRON_MENTIONS="$(podman logs "$CONTAINER_NAME" 2>&1 | bash "$SCRIPT_DIR/log-count.bash")"
echo "backend log cron/scheduler mentions: $CRON_MENTIONS (informational; staged crons.ts registers no jobs)"
