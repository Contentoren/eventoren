#!/usr/bin/env bash
# POSIX guard: when invoked via sh/dash (no BASH_VERSION), re-exec under bash
# so the bash-only gates below run unchanged. Only POSIX syntax is allowed
# above the exec line. This changes no gate, only the interpreter.
if [ -z "${BASH_VERSION:-}" ]; then
  exec bash "$0" "$@"
fi
set -euo pipefail

# Fail-closed: never inherit a deployment selection from the operator shell.
# The rehearsal target comes only from this script's pinned loopback ports.
unset CONVEX_DEPLOYMENT CONVEX_DEPLOY_KEY CONVEX_SELF_HOSTED_URL CONVEX_SELF_HOSTED_ADMIN_KEY 2>/dev/null || true
for inherited in $(compgen -e | grep '^CONVEX_' || true); do unset "$inherited"; done

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." >/dev/null 2>&1 && pwd)"
STATE_ROOT="${LOCAL_REHEARSAL_STATE_ROOT:-$HOME/.local/state/eventoren/local-rehearsal}"
CONVEX_PORT="${LOCAL_REHEARSAL_CONVEX_PORT:-13470}"
API_PORT="${LOCAL_REHEARSAL_API_PORT:-13471}"
NETWORK_NAME="${LOCAL_REHEARSAL_NETWORK:-eventoren-local-rehearsal}"
CONTAINER_NAME="${LOCAL_REHEARSAL_CONTAINER:-eventoren-local-rehearsal}"
VOLUME_NAME="${LOCAL_REHEARSAL_VOLUME:-eventoren-local-rehearsal-data}"
INSTANCE_NAME="eventoren-local-rehearsal"

# Pinned backend image (digest): the exact image this rehearsal was proven
# against (keygen admin-key derivation + authenticated CLI probe). Never :latest.
BACKEND_IMAGE="ghcr.io/get-convex/convex-backend@sha256:f0de0647e46c0ac830a6dda036ee78e4956cecc00144d951bf39b14cc570ad4d"

usage() {
  cat <<'EOF'
Usage: bootstrap.bash <up|status|down|logs|verify>

Creates an egress-isolated local Convex rehearsal runtime on 127.0.0.1 only:
  - internal podman network (no external egress route; loopback binds only)
  - named volume kept outside git under the private state root
  - container env carrying only loopback origins and a throwaway instance secret
  - real admin key derived inside the container (keygen) into cli.env 0600
  - no production env files are read or copied, ever

Environment overrides:
  LOCAL_REHEARSAL_STATE_ROOT  private state dir (default ~/.local/state/eventoren/local-rehearsal)
  LOCAL_REHEARSAL_CONVEX_PORT host loopback port for Convex (default 13470)
  LOCAL_REHEARSAL_API_PORT    host loopback port for site proxy (default 13471)
  LOCAL_REHEARSAL_CONTAINER   container name, must stay in the
                              eventoren-local-rehearsal namespace (default eventoren-local-rehearsal)
  LOCAL_REHEARSAL_NETWORK     podman network, same namespace rule (default eventoren-local-rehearsal)
  LOCAL_REHEARSAL_VOLUME      named volume, same namespace rule (default eventoren-local-rehearsal-data)
EOF
}

resolve_state_root() {
  # Validate BEFORE touching the filesystem: canonicalize the configured root
  # and refuse anything outside the allowlist before any mkdir/chmod runs.
  local raw_root="$STATE_ROOT"
  local canon
  canon="$(realpath -m "$raw_root")"
  case "$canon" in
    "$HOME/.local/state/eventoren" | "$HOME/.local/state/eventoren"/*) ;;
    *) echo "error: state root must stay under ~/.local/state/eventoren ($canon)" >&2; exit 1 ;;
  esac
  if [[ -L "$raw_root" ]]; then
    echo "error: state root must not be a symlink" >&2
    exit 1
  fi
  umask 077
  mkdir -p "$canon"
  chmod 700 "$canon"
  STATE_ROOT="$canon"
}

port_free() {
  local port="$1"
  ! ss -tln 2>/dev/null | grep -q ":$port "
}

require_loopback_ports_free() {
  require_safe_ports
  local port
  for port in "$CONVEX_PORT" "$API_PORT"; do
    if ! port_free "$port"; then
      echo "error: loopback port $port is already in use; set LOCAL_REHEARSAL_CONVEX_PORT/LOCAL_REHEARSAL_API_PORT" >&2
      exit 1
    fi
  done
}

# Namespace allowlist: overrides for container/network/volume must stay inside
# the rehearsal namespace, so an arbitrary name can never target, delete, or
# mount a shared resource. Checked before ANY podman rm/run/inspect.
require_safe_names() {
  local name
  for name in "$CONTAINER_NAME" "$NETWORK_NAME" "$VOLUME_NAME"; do
    case "$name" in
      eventoren-local-rehearsal|eventoren-local-rehearsal-*) ;;
      *)
        echo "error: rehearsal resource names must be eventoren-local-rehearsal or its '-...' namespace (got '$name')" >&2
        exit 1
        ;;
    esac
  done
}

# Port overrides must be integers in range and must never reuse a shared
# preview/production port. Checked on every path (up AND verify), not just up.
require_safe_ports() {
  local port
  for port in "$CONVEX_PORT" "$API_PORT"; do
    case "$port" in
      ''|*[!0-9]*)
        echo "error: rehearsal port must be an integer (got '$port')" >&2
        exit 1
        ;;
    esac
    if [[ "$port" -lt 1 || "$port" -gt 65535 ]]; then
      echo "error: rehearsal port out of range 1-65535 (got '$port')" >&2
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

write_container_env() {
  umask 077
  local instance_secret
  instance_secret="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
  cat >"$STATE_ROOT/container.env" <<EOF
INSTANCE_NAME=$INSTANCE_NAME
INSTANCE_SECRET=$instance_secret
CONVEX_CLOUD_ORIGIN=http://127.0.0.1:$CONVEX_PORT
CONVEX_SITE_ORIGIN=http://127.0.0.1:$API_PORT
DISABLE_BEACON=true
REDACT_LOGS_TO_CLIENT=true
DO_NOT_REQUIRE_SSL=true
DOCUMENT_RETENTION_DELAY=172800
MALLOC_ARENA_MAX=2
RUST_LOG=warn
EOF
  chmod 600 "$STATE_ROOT/container.env"
  cat >"$STATE_ROOT/runtime.env" <<EOF
PUBLIC_ENV_MODE=development
CONVEX_REHEARSAL_MODE=local
PUBLIC_BASE_URL_CONVEX=http://127.0.0.1:$CONVEX_PORT
PUBLIC_BASE_URL_API=http://127.0.0.1:$API_PORT
PUBLIC_BASE_URL_SITE=http://127.0.0.1:$CONVEX_PORT
PUBLIC_BASE_URL_APP=http://127.0.0.1:$CONVEX_PORT
AUTH_SECRET=local-rehearsal-only-not-a-credential
EOF
  chmod 600 "$STATE_ROOT/runtime.env"
  printf '%s' "$INSTANCE_NAME" >"$STATE_ROOT/target-identity.txt"
  chmod 600 "$STATE_ROOT/target-identity.txt"
  # cli.env is written only after the backend derives the real admin key.
  rm -f "$STATE_ROOT/cli.env"
}

# Derive the real admin key inside the running container (its own env and
# persisted credentials) and write the CLI env that authenticates this
# instance and no other. Never a placeholder.
write_cli_env() {
  umask 077
  local admin_key
  admin_key="$(podman exec "$CONTAINER_NAME" ./generate_admin_key.sh 2>/dev/null | tail -n 1)"
  if [[ -z "$admin_key" || "$admin_key" == *$'\n'* || ${#admin_key} -lt 32 ]]; then
    echo "error: backend did not yield a usable admin key; refusing to write cli.env" >&2
    exit 1
  fi
  if [[ "$admin_key" == *placeholder* || "$admin_key" == replace-* ]]; then
    echo "error: backend yielded a placeholder admin key; refusing to write cli.env" >&2
    exit 1
  fi
  cat >"$STATE_ROOT/cli.env" <<EOF
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:$CONVEX_PORT
CONVEX_SELF_HOSTED_ADMIN_KEY=$admin_key
EOF
  chmod 600 "$STATE_ROOT/cli.env"
}

# Authenticated liveness probe: proves cli.env targets this local instance and
# the admin key authenticates it. Prints no data.
authenticated_probe() {
  (cd "$REPO_ROOT" && bunx convex data --env-file "$STATE_ROOT/cli.env" >/dev/null 2>&1)
}

command_up() {
  resolve_state_root
  require_safe_names
  command -v podman >/dev/null 2>&1 || { echo "error: podman is required" >&2; exit 1; }
  if ! podman image exists "$BACKEND_IMAGE" >/dev/null 2>&1; then
    echo "pulling pinned rehearsal backend image (digest) ..."
    podman pull "$BACKEND_IMAGE" >/dev/null || { echo "error: cannot pull pinned backend image" >&2; exit 1; }
  fi
  # Remove our own previous container first so a re-up does not trip the
  # port check on its own loopback binds; foreign occupants still fail below.
  podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  require_loopback_ports_free
  write_container_env
  if ! podman network exists "$NETWORK_NAME" >/dev/null 2>&1; then
    podman network create --internal "$NETWORK_NAME" >/dev/null
  fi
  podman run -d --name "$CONTAINER_NAME" \
    --network "$NETWORK_NAME" \
    --publish "127.0.0.1:$CONVEX_PORT:3210" \
    --publish "127.0.0.1:$API_PORT:3211" \
    --env-file "$STATE_ROOT/container.env" \
    --volume "$VOLUME_NAME:/convex/data" \
    "$BACKEND_IMAGE" >/dev/null
  for _ in $(seq 1 36); do
    if curl -fsS --max-time 5 "http://127.0.0.1:$CONVEX_PORT/version" >/dev/null 2>&1; then
      break
    fi
    sleep 5
  done
  curl -fsS --max-time 5 "http://127.0.0.1:$CONVEX_PORT/version" >/dev/null 2>&1 || {
    echo "error: local rehearsal backend did not become healthy" >&2
    podman logs "$CONTAINER_NAME" 2>&1 | tail -n 50 >&2 || true
    exit 1
  }
  write_cli_env
  authenticated_probe || {
    echo "error: derived admin key does not authenticate the local backend; refusing up" >&2
    exit 1
  }
  echo "local rehearsal Convex is healthy on 127.0.0.1:$CONVEX_PORT/$API_PORT (network $NETWORK_NAME, volume $VOLUME_NAME)"
  echo "admin key derived in-container and authenticated (cli.env 0600, placeholder-free)"
}

command_status() {
  resolve_state_root
  require_safe_names
  require_safe_ports
  echo "state_root=$STATE_ROOT"
  echo "target_identity=$(cat "$STATE_ROOT/target-identity.txt" 2>/dev/null || echo missing)"
  echo "ports=127.0.0.1:$CONVEX_PORT,127.0.0.1:$API_PORT"
  echo "network=$NETWORK_NAME"
  echo "container=$CONTAINER_NAME"
  echo "volume=$VOLUME_NAME"
  echo "image=$BACKEND_IMAGE"
  podman inspect "$CONTAINER_NAME" --format '{{.State.Status}} {{json .NetworkSettings.Ports}}' 2>/dev/null || {
    echo "container=absent"
    exit 1
  }
  podman network inspect "$NETWORK_NAME" --format 'internal={{.internal}}' 2>/dev/null || true
  curl -fsS --max-time 5 "http://127.0.0.1:$CONVEX_PORT/version" 2>/dev/null || {
    echo "health=unreachable"
    exit 1
  }
  echo
  echo "health=ok"
}

command_verify() {
  resolve_state_root
  command_status >/dev/null
  # 1. Internal network only.
  if podman network inspect "$NETWORK_NAME" 2>/dev/null | python3 -c 'import json,sys; raise SystemExit(0 if json.load(sys.stdin)[0].get("internal") is True else 1)'; then
    echo "egress=internal-network"
  else
    echo "error: rehearsal network $NETWORK_NAME is not internal" >&2
    exit 1
  fi
  # 2. The container's exact sole network is the rehearsal network.
  local networks
  networks="$(podman inspect "$CONTAINER_NAME" --format '{{json .NetworkSettings.Networks}}' 2>/dev/null | python3 -c 'import json,sys; print(" ".join(sorted(json.load(sys.stdin).keys())))')"
  if [[ "$networks" != "$NETWORK_NAME" ]]; then
    echo "error: rehearsal container is attached to unexpected networks: $networks" >&2
    exit 1
  fi
  echo "networks=$networks (sole)"
  # 3. Every published bind is loopback-only.
  if podman inspect "$CONTAINER_NAME" --format '{{json .NetworkSettings.Ports}}' 2>/dev/null | python3 -c 'import json,sys; raise SystemExit(0 if all(b.get("HostIp")=="127.0.0.1" for b in sum(json.load(sys.stdin).values(), [])) else 1)'; then
    echo "binds=127.0.0.1-only"
  else
    echo "error: rehearsal container publishes a non-loopback bind" >&2
    exit 1
  fi
  # 4. Pinned backend image digest.
  local digest
  digest="$(podman inspect "$CONTAINER_NAME" --format '{{.ImageDigest}}' 2>/dev/null)"
  if [[ "$digest" != "sha256:f0de0647e46c0ac830a6dda036ee78e4956cecc00144d951bf39b14cc570ad4d" ]]; then
    echo "error: rehearsal container is not the pinned backend image (digest $digest)" >&2
    exit 1
  fi
  echo "image=pinned-digest"
  # 5. Live backend identity (not the file alone).
  local live_identity file_identity
  live_identity="$(podman exec "$CONTAINER_NAME" sh -c 'printf %s "$INSTANCE_NAME"' 2>/dev/null)"
  file_identity="$(cat "$STATE_ROOT/target-identity.txt" 2>/dev/null || true)"
  if [[ "$live_identity" != "$INSTANCE_NAME" || "$file_identity" != "$INSTANCE_NAME" ]]; then
    echo "error: rehearsal backend identity mismatch (live or file); refusing" >&2
    exit 1
  fi
  echo "identity=$INSTANCE_NAME (live backend + file agree)"
  # 6. Authenticated identity: cli.env URL is exactly the local target and its
  # key authenticates this instance.
  [[ -f "$STATE_ROOT/cli.env" ]] || { echo "error: cli.env missing; rerun bootstrap.bash up" >&2; exit 1; }
  if grep -Eq 'replace-with-local-rehearsal-admin-key|replace-' "$STATE_ROOT/cli.env"; then
    echo "error: cli.env carries a placeholder admin key; rerun bootstrap.bash up" >&2
    exit 1
  fi
  local cli_url
  cli_url="$(awk -F= '$1=="CONVEX_SELF_HOSTED_URL"{print $2}' "$STATE_ROOT/cli.env" | tail -n 1)"
  if [[ "$cli_url" != "http://127.0.0.1:$CONVEX_PORT" ]]; then
    echo "error: cli.env URL is not exactly the local rehearsal target ($cli_url)" >&2
    exit 1
  fi
  authenticated_probe || {
    echo "error: cli.env admin key does not authenticate the local backend" >&2
    exit 1
  }
  echo "auth=cli.env targets local backend and authenticates it"
  # 7. Side-effect safety on the ACTUAL backend env (not a proxy file): no
  # billing/payment/email/sso/storage/remote-state credentials. Prefixes match
  # the full variable name (e.g. EVENTOREN_BILLING_BASE_URL, STRIPE_SECRET_KEY),
  # never the bare prefix alone.
  if podman exec "$CONTAINER_NAME" env 2>/dev/null | grep -Eq '^(EVENTOREN_BILLING_|EVENTOREN_PAYMENT_|AUTH_SMTP_|AUTH_RESEND_|AUTH_MAILJET_|ZITADEL_CLIENT_SECRET|ZITADEL_MANAGEMENT_TOKEN|R2_SECRET|r2_secret|STRIPE_|DATABASE_URL|POSTGRES_URL|MYSQL_URL|SENTRY_DSN|CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY)'; then
    echo "error: rehearsal backend env carries blocked side-effect credentials" >&2
    exit 1
  fi
  # 7b. The real Convex UDF env (container env != UDF env): list names only
  # (never values) through the authenticated local cli.env and refuse any
  # blocked credential there too. Fail closed when the list cannot be read.
  local udf_names
  udf_names="$(cd "$REPO_ROOT" && bunx convex env list --env-file "$STATE_ROOT/cli.env" --names-only 2>/dev/null)" || {
    echo "error: cannot list UDF env on the local backend; refusing verify" >&2
    exit 1
  }
  if printf '%s\n' "$udf_names" | grep -Eq '^(EVENTOREN_BILLING_|EVENTOREN_PAYMENT_|AUTH_SMTP_|AUTH_RESEND_|AUTH_MAILJET_|ZITADEL_CLIENT_SECRET|ZITADEL_MANAGEMENT_TOKEN|R2_SECRET|STRIPE_|DATABASE_URL|POSTGRES_URL|MYSQL_URL|SENTRY_DSN|CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY)'; then
    echo "error: rehearsal UDF env carries blocked side-effect credentials" >&2
    exit 1
  fi
  # 8. The runtime env file must exist and carry no blocked keys either.
  [[ -f "$STATE_ROOT/runtime.env" ]] || { echo "error: runtime.env missing; rerun bootstrap.bash up" >&2; exit 1; }
  if grep -Eq '^[[:space:]]*(export[[:space:]]+)?(EVENTOREN_BILLING_|EVENTOREN_PAYMENT_|AUTH_SMTP_|AUTH_RESEND_|AUTH_MAILJET_|ZITADEL_CLIENT_SECRET|ZITADEL_MANAGEMENT_TOKEN|R2_SECRET|STRIPE_|DATABASE_URL|POSTGRES_URL|MYSQL_URL|SENTRY_DSN|CONVEX_DEPLOYMENT|CONVEX_DEPLOY_KEY)' "$STATE_ROOT/runtime.env"; then
    echo "error: rehearsal runtime env carries blocked side-effect credentials" >&2
    exit 1
  fi
  echo "side-effects=backend env, UDF env, and runtime.env carry no blocked credentials"
  echo "verify=ok (rehearsal functions are deployed with an empty cron registry; see stage-deploy.bash status)"
}

command_down() {
  resolve_state_root
  require_safe_names
  podman rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
  echo "local rehearsal container removed (volume and network stay private)"
}

COMMAND="${1:-}"
case "$COMMAND" in
  up) command_up ;;
  status) command_status ;;
  verify) command_verify ;;
  down) command_down ;;
  logs) podman logs "$CONTAINER_NAME" 2>&1 | tail -n 100 ;;
  *) usage >&2; exit 1 ;;
esac
