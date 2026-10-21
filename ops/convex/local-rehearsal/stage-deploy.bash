#!/usr/bin/env bash
set -euo pipefail

# Fail-closed: never inherit a deployment selection from the operator shell.
# The deploy target comes only from the verified cli.env (exact local URL +
# in-container-derived admin key). Production env is never read or copied.
unset CONVEX_DEPLOYMENT CONVEX_DEPLOY_KEY CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY 2>/dev/null || true
for inherited in $(compgen -e | grep '^CONVEX_' || true); do unset "$inherited"; done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." >/dev/null 2>&1 && pwd)"
STATE_ROOT="${LOCAL_REHEARSAL_STATE_ROOT:-$HOME/.local/state/eventoren/local-rehearsal}"
CONVEX_PORT="${LOCAL_REHEARSAL_CONVEX_PORT:-13470}"
API_PORT="${LOCAL_REHEARSAL_API_PORT:-13471}"
CONTAINER_NAME="${LOCAL_REHEARSAL_CONTAINER:-eventoren-local-rehearsal}"
INSTANCE_NAME="eventoren-local-rehearsal"
STAGING_ROOT="$STATE_ROOT/staging/rehearsal-functions"
STAGING_CONVEX="$STAGING_ROOT/convex"
FIXTURE_MARKER="eventoren-local-rehearsal"

usage() {
  cat <<'EOF'
Usage: stage-deploy.bash <prepare|deploy|status|fixtures|auth-sync-only>

Private staged deploy of the current backend wrappers into the isolated local
rehearsal backend (127.0.0.1 only), with cron registration DISABLED:
  prepare   build $STATE_ROOT/staging/rehearsal-functions from the current
            worktree wrappers (copies convex/*.ts + schema, empty crons.ts,
            staging-only fixture module, symlinks src/ui/node_modules back,
            independent _generated). Never touches real convex/crons.ts.
  deploy    verify isolation fresh, enforce empty cron registry on the staged
            source, deploy via --env-file <verified cli.env>, then configure
            ONLY local AUTH_SECRET + loopback PUBLIC_* + CONVEX_REHEARSAL_MODE.
            Never copies production env.
  status    verify + deployed function counts/names + UDF env allowlist +
            cron-registry gates (names and counts only, never values).
  fixtures  run the staging-only fixture mutation (synthetic customer/admin +
            authSessions) and store tokens in a private 0600 file, never logs.
  auth-sync-only
            re-read the CURRENT backend AUTH_SECRET (no rotation, no redeploy)
            through the verified cli.env into a 0600 temp file and sync
            runtime.env to it for SSR restarts. Values never touch argv/logs.

Cron safety: staged crons.ts exports an empty registry, and the cron-spec gate
runs before AND after deploy. Functions may schedule internal actions, but
with provider credentials absent and egress denied to the internal network,
those actions cannot reach the outside.
EOF
}

resolve_state_root() {
  local canon
  canon="$(realpath -m "$STATE_ROOT")"
  case "$canon" in
    "$HOME/.local/state/eventoren" | "$HOME/.local/state/eventoren"/*) ;;
    *) echo "error: state root must stay under ~/.local/state/eventoren ($canon)" >&2; exit 1 ;;
  esac
  if [[ -L "$STATE_ROOT" ]]; then
    echo "error: state root must not be a symlink" >&2
    exit 1
  fi
  umask 077
  mkdir -p "$canon"
  chmod 700 "$canon"
  STATE_ROOT="$canon"
  STAGING_ROOT="$STATE_ROOT/staging/rehearsal-functions"
  STAGING_CONVEX="$STAGING_ROOT/convex"
}

require_safe_names() {
  case "$CONTAINER_NAME" in
    eventoren-local-rehearsal|eventoren-local-rehearsal-*) ;;
    *) echo "error: rehearsal container must stay in the eventoren-local-rehearsal namespace" >&2; exit 1 ;;
  esac
}

require_safe_ports() {
  local port
  for port in "$CONVEX_PORT" "$API_PORT"; do
    case "$port" in ''|*[!0-9]*) echo "error: rehearsal port must be an integer" >&2; exit 1 ;; esac
    if [[ "$port" -lt 1 || "$port" -gt 65535 ]]; then
      echo "error: rehearsal port out of range 1-65535" >&2
      exit 1
    fi
    case "$port" in
      3210|3211|3234|3235|6791|8320|8321)
        echo "error: rehearsal refuses the shared preview/production port $port" >&2
        exit 1
        ;;
    esac
  done
}

fresh_verify() {
  bash "$SCRIPT_DIR/bootstrap.bash" verify || {
    echo "error: rehearsal isolation verify failed; refusing" >&2
    exit 1
  }
}

# Cron-spec gate on the STAGED source: no scheduling call may exist anywhere
# under the staged convex/ dir. Runs before AND after deploy.
cron_spec_gate() {
  local hits
  hits="$(grep -rnE 'crons\.(interval|cron|hourly|daily|weekly|monthly)| unstable_cron|schedule\(' "$STAGING_CONVEX" 2>/dev/null || true)"
  if [[ -n "$hits" ]]; then
    echo "error: staged source registers cron/scheduled jobs; refusing:" >&2
    printf '%s\n' "$hits" >&2
    exit 1
  fi
  echo "cron-registry=empty (no scheduling calls in staged source)"
}

command_prepare() {
  resolve_state_root
  require_safe_names
  require_safe_ports
  umask 077
  mkdir -p "$STAGING_ROOT"
  chmod 700 "$STAGING_ROOT"
  rm -rf "$STAGING_CONVEX"
  mkdir -p "$STAGING_CONVEX"
  # Copy current root wrappers + schema. Never the real crons.ts (replaced
  # below with an empty registry) and never _generated (regenerated in place,
  # independent of the worktree).
  local f base count=0
  for f in "$REPO_ROOT"/convex/*.ts; do
    base="$(basename "$f")"
    [[ "$base" == "crons.ts" ]] && continue
    cp "$f" "$STAGING_CONVEX/$base"
    count=$((count + 1))
  done
  cp "$REPO_ROOT/convex/tsconfig.json" "$STAGING_CONVEX/tsconfig.json"
  cat >"$STAGING_CONVEX/crons.ts" <<'EOF'
import { cronJobs } from "convex/server"

// Local rehearsal staging: cron registration is DISABLED. The empty registry
// deploys zero scheduled jobs; functions may still schedule internal actions,
// which cannot escape the internal-only podman network.
const crons = cronJobs()

export default crons
EOF
  # Scratch package.json: same #-import map as the worktree, resolved through
  # the src/ui symlinks below (read-only view of current sources), plus the
  # worktree dependency map (the Convex CLI refuses to push without `convex`
  # in dependencies; resolution itself uses the symlinked node_modules).
  python3 - "$REPO_ROOT/package.json" "$STAGING_ROOT/package.json" <<'PY'
import json, sys
with open(sys.argv[1]) as f:
    repo = json.load(f)
with open(sys.argv[2], "w") as f:
    json.dump(
        {
            "name": "eventoren-local-rehearsal-staging",
            "private": True,
            "type": repo.get("type", "module"),
            "imports": repo["imports"],
            "dependencies": repo.get("dependencies", {}),
        },
        f,
        indent=2,
    )
    f.write("\n")
PY
  chmod 600 "$STAGING_ROOT/package.json"
  ln -sfn "$REPO_ROOT/src" "$STAGING_ROOT/src"
  ln -sfn "$REPO_ROOT/ui" "$STAGING_ROOT/ui"
  ln -sfn "$REPO_ROOT/node_modules" "$STAGING_ROOT/node_modules"
  write_fixture_module
  cron_spec_gate
  # Provenance manifest: what was staged, hashed (names and hashes only).
  {
    echo "staged_at=$(date -u +%Y%m%dT%H%M%SZ)"
    echo "source_worktree=$REPO_ROOT"
    echo "wrappers_copied=$count"
    (cd "$STAGING_CONVEX" && sha256sum -- *.ts | sort)
  } >"$STAGING_ROOT/staging-manifest.txt"
  chmod 600 "$STAGING_ROOT/staging-manifest.txt"
  echo "prepare=ok wrappers=$count staging=$STAGING_ROOT"
  echo "rerun prepare + deploy after workers change wrappers (parent scope)"
}

write_fixture_module() {
  # Staging-only fixture module: exists ONLY here, never in the repo's
  # convex/. Creates synthetic customer/admin users + authSessions with local
  # JWTs (signed by the local AUTH_SECRET), and refuses unless BOTH the
  # explicit rehearsal marker arg AND the local UDF env marker are present.
  # It only inserts new docs under a distinctive synthetic email and never
  # modifies the copied production rows; production tokens cannot validate
  # under the local secret.
  cat >"$STAGING_CONVEX/rehearsalFixtures.ts" <<'EOF'
import { v } from "convex/values"
import dayjs from "dayjs"
import { mutation, query } from "./_generated/server.js"
import { createToken } from "#src/auth/server/jwt_token/createToken.ts"
import { tokenValidDurationInDays } from "#src/auth/server/jwt_token/tokenValidDurationInDays.ts"

// Read-only preconditions probe: booleans and counts only, never values.
export const rehearsalFixtureDiagnose = query({
  args: { marker: v.string() },
  handler: async (ctx, args) => {
    const mode = process.env.CONVEX_REHEARSAL_MODE
    const secret = process.env.AUTH_SECRET
    const secretUsable = !!secret && !secret.startsWith("replace-with-")
    let emailIndexOk = false
    try {
      const probe = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", "local-rehearsal-probe@invalid.local"))
        .unique()
      emailIndexOk = probe === null
    } catch {
      emailIndexOk = false
    }
    let tokenSigns = false
    try {
      if (secretUsable) tokenSigns = (await createToken("diagnose", secret as string)) !== ""
    } catch {
      tokenSigns = false
    }
    return {
      markerOk: args.marker === "eventoren-local-rehearsal",
      modeIsLocal: mode === "local",
      secretUsable,
      emailIndexOk,
      tokenSigns,
    }
  },
})

const argsValidator = v.object({
  marker: v.string(),
  runTag: v.string(),
})

type FixtureRole = "customer" | "admin"

export const rehearsalFixtureEnsure = mutation({
  args: argsValidator,
  handler: async (ctx, args) => {
    const op = "rehearsalFixtureEnsure"
    if (process.env.CONVEX_REHEARSAL_MODE !== "local")
      throw new Error(`${op}: refusing (not a local rehearsal backend)`)
    if (args.marker !== "eventoren-local-rehearsal")
      throw new Error(`${op}: refusing (explicit rehearsal marker required)`)
    if (!/^[a-z0-9-]{1,32}$/.test(args.runTag))
      throw new Error(`${op}: refusing (runTag charset)`)
    const secret = process.env.AUTH_SECRET
    if (!secret || secret.startsWith("replace-with-"))
      throw new Error(`${op}: refusing (local AUTH_SECRET missing)`)
    const now = new Date().toISOString()
    const users: Array<{ role: FixtureRole; userId: string; reused: boolean }> = []
    const sessions: Array<{ role: FixtureRole; sessionId: string; userId: string; expiresAt: string; token: string }> =
      []
    for (const role of ["customer", "admin"] as const) {
      const email = `local-rehearsal-${args.runTag}-${role}@invalid.local`
      const existing = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .unique()
      let userId
      let reused = false
      if (existing) {
        if (existing.role !== role) throw new Error(`${op}: refusing (synthetic email owned by another role)`)
        userId = existing._id
        reused = true
      } else {
        userId = await ctx.db.insert("users", {
          name: `Local Rehearsal ${role} ${args.runTag}`,
          email,
          role,
          createdAt: now,
          updatedAt: now,
        })
      }
      const token = await createToken(userId, secret)
      if (!token) throw new Error(`${op}: token signing failed`)
      const expiresAt = dayjs(now).add(tokenValidDurationInDays, "days").toISOString()
      const sessionId = await ctx.db.insert("authSessions", {
        userId,
        loginMethod: "dev",
        token,
        expiresAt,
        createdAt: now,
        updatedAt: now,
      })
      users.push({ role, userId, reused })
      sessions.push({ role, sessionId, userId, expiresAt, token })
    }
    return { marker: "eventoren-local-rehearsal", runTag: args.runTag, users, sessions }
  },
})
EOF
  echo "fixture-module=staged-only (convex/rehearsalFixtures.ts)"
}

command_deploy() {
  resolve_state_root
  require_safe_names
  require_safe_ports
  fresh_verify
  [[ -d "$STAGING_CONVEX" ]] || { echo "error: staging missing; run stage-deploy.bash prepare first" >&2; exit 1; }
  cron_spec_gate
  # Deploy from the staging root so the empty crons.ts is what ships. Target
  # comes only from the verified cli.env; inherited CONVEX_* are cleared.
  (cd "$STAGING_ROOT" && bunx convex deploy --env-file "$STATE_ROOT/cli.env" --typecheck try)
  cron_spec_gate
  command_env_local_only
  fresh_verify
  command_status
}

# Configure ONLY local values on the rehearsal backend via the authenticated
# local cli.env. Never reads or copies production env. AUTH_SECRET is random
# per deploy, passed via a 0600 temp file (never argv, never stdout). The
# runtime.env pre-check runs BEFORE the rotation so a file-scope failure can
# never strand a rotated secret; the runtime.env sync runs AFTER the
# successful UDF set and BEFORE the temp secret file is deleted, so a fresh
# SSR restart reuses the correct secret.
command_env_local_only() {
  umask 077
  local secret_file="$STATE_ROOT/.udf-auth-secret.tmp"
  od -An -N32 -tx1 /dev/urandom | tr -d ' \n' >"$secret_file"
  chmod 600 "$secret_file"
  python3 "$REPO_ROOT/scripts/localRehearsalRuntimeAuthSync.py" --runtime "$STATE_ROOT/runtime.env" --secret-file "$secret_file" --check || {
    echo "error: runtime.env prevalidation failed; refusing AUTH_SECRET rotation" >&2
    rm -f "$secret_file"
    exit 1
  }
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" AUTH_SECRET --from-file "$secret_file" --force >/dev/null)
  python3 "$REPO_ROOT/scripts/localRehearsalRuntimeAuthSync.py" --runtime "$STATE_ROOT/runtime.env" --secret-file "$secret_file" || {
    echo "error: runtime.env AUTH_SECRET sync failed after UDF set; refusing" >&2
    rm -f "$secret_file"
    exit 1
  }
  rm -f "$secret_file"
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" CONVEX_REHEARSAL_MODE local --force >/dev/null)
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" PUBLIC_ENV_MODE development --force >/dev/null)
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" PUBLIC_BASE_URL_CONVEX "http://127.0.0.1:$CONVEX_PORT" --force >/dev/null)
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" PUBLIC_BASE_URL_API "http://127.0.0.1:$API_PORT" --force >/dev/null)
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" PUBLIC_BASE_URL_SITE "http://127.0.0.1:$CONVEX_PORT" --force >/dev/null)
  (cd "$REPO_ROOT" && bunx convex env set --env-file "$STATE_ROOT/cli.env" PUBLIC_BASE_URL_APP "http://127.0.0.1:$CONVEX_PORT" --force >/dev/null)
  echo "udf-env=local-only (AUTH_SECRET rotated, loopback PUBLIC_*, CONVEX_REHEARSAL_MODE=local)"
}

command_status() {
  resolve_state_root
  require_safe_names
  require_safe_ports
  fresh_verify
  # Deployed functions (names only): proves wrappers are live on rehearsal.
  local spec_file="$STATE_ROOT/staging/function-spec.json"
  umask 077
  (cd "$STAGING_ROOT" && bunx convex function-spec --env-file "$STATE_ROOT/cli.env" >"$spec_file" 2>/dev/null) || {
    echo "error: cannot read deployed function spec; refusing status" >&2
    exit 1
  }
  chmod 600 "$spec_file"
  python3 - "$spec_file" <<'PY'
import json, sys
from collections import Counter
spec = json.load(open(sys.argv[1]))
funcs = spec.get("functions", [])
types = Counter(str(f.get("functionType", "?")) for f in funcs)
mods: Counter[str] = Counter()
for f in funcs:
    ident = f.get("identifier")
    if isinstance(ident, str) and ":" in ident:
        mods[ident.split(":")[0]] += 1
    else:
        mods["<http>"] += 1
print(f"functions={len(funcs)} modules={len(mods)}")
for t in sorted(types):
    print(f"  type {t}: {types[t]}")
for mod in sorted(mods):
    print(f"  {mod}: {mods[mod]}")
if not funcs:
    print("error: no functions deployed to rehearsal", file=sys.stderr)
    raise SystemExit(1)
PY
  # UDF env allowlist: exactly the local-only set, nothing else (names only).
  local udf_names
  udf_names="$(cd "$REPO_ROOT" && bunx convex env list --env-file "$STATE_ROOT/cli.env" --names-only 2>/dev/null)" || {
    echo "error: cannot list UDF env; refusing status" >&2
    exit 1
  }
  local want
  want="$(printf '%s\n' AUTH_SECRET CONVEX_REHEARSAL_MODE PUBLIC_BASE_URL_API PUBLIC_BASE_URL_APP PUBLIC_BASE_URL_CONVEX PUBLIC_BASE_URL_SITE PUBLIC_ENV_MODE | sort)"
  local got
  got="$(printf '%s\n' "$udf_names" | grep -v '^No environment variables set' | grep -v '^$' | sort)"
  if [[ "$got" != "$want" ]]; then
    echo "error: UDF env is not exactly the local-only set; refusing status" >&2
    printf '%s\n' "$got" >&2
    exit 1
  fi
  echo "udf-env=exactly the local-only set (7 names)"
  cron_spec_gate
  local cron_mentions
  cron_mentions="$(podman logs "$CONTAINER_NAME" 2>&1 | bash "$SCRIPT_DIR/log-count.bash")"
  echo "backend log cron/scheduler mentions: $cron_mentions (informational; staged registry is empty)"
  echo "status=ok (functions deployed, empty cron registry, internal network sole egress)"
}

command_fixtures() {
  resolve_state_root
  require_safe_names
  require_safe_ports
  fresh_verify
  # The local UDF marker must be present or the fixture module refuses anyway.
  local mode
  mode="$(cd "$REPO_ROOT" && bunx convex env get --env-file "$STATE_ROOT/cli.env" CONVEX_REHEARSAL_MODE 2>/dev/null | tail -n 1)"
  [[ "$mode" == "local" ]] || { echo "error: CONVEX_REHEARSAL_MODE is not local on rehearsal; refusing fixtures" >&2; exit 1; }
  local run_tag
  run_tag="rehearsal-$(date -u +%Y%m%dT%H%M%SZ | tr 'T:Z' '---' | tr -cd 'a-z0-9-')"
  local out_file="$STATE_ROOT/staging/fixture-tokens.json"
  umask 077
  (cd "$STAGING_ROOT" && bunx convex run rehearsalFixtures:rehearsalFixtureEnsure "{\"marker\":\"$FIXTURE_MARKER\",\"runTag\":\"$run_tag\"}" --env-file "$STATE_ROOT/cli.env" >"$out_file" 2>/dev/null) || {
    echo "error: fixture mutation failed; refusing" >&2
    exit 1
  }
  chmod 600 "$out_file"
  python3 - "$out_file" <<'PY'
import json, sys
data = json.load(open(sys.argv[1]))
users = data.get("users", [])
sessions = data.get("sessions", [])
for u in users:
    print(f"user role={u['role']} id={u['userId']} reused={u['reused']}")
for s in sessions:
    print(f"session role={s['role']} id={s['sessionId']} user={s['userId']} expires={s['expiresAt']}")
print(f"fixtures=users:{len(users)} sessions:{len(sessions)} (tokens stored, never printed)")
PY
  echo "fixture_file=$out_file (0600; hand tokens to browser tests from this file only)"
}

# Re-sync runtime.env to the CURRENT backend AUTH_SECRET without rotating it,
# redeploying, or restarting anything. The secret travels only through a 0600
# temp file (never argv, never stdout/logs); the temp file is removed after
# the helper succeeds or fails.
command_auth_sync_only() {
  resolve_state_root
  require_safe_names
  require_safe_ports
  fresh_verify
  umask 077
  local secret_file="$STATE_ROOT/.udf-auth-secret.tmp"
  (cd "$REPO_ROOT" && bunx convex env get --env-file "$STATE_ROOT/cli.env" AUTH_SECRET 2>/dev/null | tail -n 1 >"$secret_file") || {
    echo "error: cannot read current AUTH_SECRET from the local backend; refusing" >&2
    rm -f "$secret_file"
    exit 1
  }
  chmod 600 "$secret_file"
  python3 "$REPO_ROOT/scripts/localRehearsalRuntimeAuthSync.py" --runtime "$STATE_ROOT/runtime.env" --secret-file "$secret_file" || {
    rm -f "$secret_file"
    exit 1
  }
  rm -f "$secret_file"
  echo "udf-env=auth-sync-only (runtime.env re-synced to current AUTH_SECRET, no rotation)"
}

COMMAND="${1:-}"
case "$COMMAND" in
  prepare) command_prepare ;;
  deploy) command_deploy ;;
  status) command_status ;;
  fixtures) command_fixtures ;;
  auth-sync-only) command_auth_sync_only ;;
  *) usage >&2; exit 1 ;;
esac

