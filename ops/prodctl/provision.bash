#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." >/dev/null 2>&1 && pwd)"
command -v prodctl >/dev/null 2>&1 || { echo "error: prodctl is required" >&2; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "error: python3 is required" >&2; exit 1; }
APP="eventoren"
ENV_FILE="$REPO_DIR/.env.production"

if [[ -L "$ENV_FILE" || ( -e "$ENV_FILE" && ! -f "$ENV_FILE" ) ]]; then
  echo "error: $ENV_FILE must be a regular file" >&2
  exit 1
fi
if [[ ! -f "$ENV_FILE" ]]; then
  echo "error: $ENV_FILE is required" >&2
  exit 1
fi

if ! prodctl status "$APP" >/dev/null 2>&1; then
  prodctl create "$APP" --type quadlet --mem "${PRODCTL_MEMORY:-4G}" --cpu "${PRODCTL_CPU:-200%}" \
  --route convex:eventoren-convex.contentoren.de \
  --route api:eventoren-api.contentoren.de
fi

status_json="$(prodctl status "$APP" --json)"
reconcile_prodctl_routes() {
  local status_json="$1"
  local route_operations
  route_operations="$(python3 - "$status_json" "eventoren-convex.contentoren.de" "eventoren-api.contentoren.de" <<'PY'
import json
import sys

try:
    status = json.loads(sys.argv[1])
    desired = {"convex": sys.argv[2], "api": sys.argv[3]}
    ports = status["ports"]
    routes = status["routes"]
except (KeyError, TypeError, ValueError, json.JSONDecodeError, IndexError):
    raise SystemExit("prodctl status did not return named production routes")

if not isinstance(ports, dict) or any(
    isinstance(ports.get(name), bool) or not isinstance(ports.get(name), int) or ports.get(name) < 1
    for name in desired
):
    raise SystemExit("prodctl status did not return valid named production ports")
if not isinstance(routes, list):
    raise SystemExit("prodctl status did not return app routes")

normalized = []
for route in routes:
    if not isinstance(route, dict) or not isinstance(route.get("port"), str) or not isinstance(route.get("hostname"), str):
        raise SystemExit("prodctl status returned an invalid app route")
    normalized.append((route["port"], route["hostname"]))

for name, hostname in desired.items():
    if any(route_host == hostname and route_name != name for route_name, route_host in normalized):
        raise SystemExit(f"desired hostname {hostname} is assigned to another app route")

stale_hosts = set()
for name, hostname in desired.items():
    matches = [(route_name, route_host) for route_name, route_host in normalized if route_name == name]
    if sum(route_host == hostname for _, route_host in matches) > 1:
        raise SystemExit(f"prodctl status contains duplicate route {name}:{hostname}")
    for _, route_host in matches:
        if route_host != hostname and route_host not in stale_hosts:
            print(f"remove|{route_host}")
            stale_hosts.add(route_host)
    if not any(route_host == hostname for _, route_host in matches):
        print(f"add|{name}|{hostname}")
PY
)"
  while IFS='|' read -r operation route_name route_host; do
    [[ -n "$operation" ]] || continue
    case "$operation" in
      remove)
        prodctl route "$APP" --remove-hostname "$route_name"
        ;;
      add)
        prodctl route "$APP" --add-route "$route_name:$route_host"
        ;;
      *)
        echo "error: invalid prodctl route reconciliation operation" >&2
        exit 1
        ;;
    esac
  done <<<"$route_operations"

  status_json="$(prodctl status "$APP" --json)"
  python3 - "$status_json" "eventoren-convex.contentoren.de" "eventoren-api.contentoren.de" <<'PY'
import json
import sys

try:
    status = json.loads(sys.argv[1])
    expected = {"convex": sys.argv[2], "api": sys.argv[3]}
    routes = status["routes"]
except (KeyError, TypeError, ValueError, json.JSONDecodeError, IndexError):
    raise SystemExit("prodctl status did not return routes after reconciliation")

if not isinstance(routes, list):
    raise SystemExit("prodctl status did not return routes after reconciliation")
for route in routes:
    if not isinstance(route, dict):
        raise SystemExit("prodctl status returned an invalid route after reconciliation")
    route_name = route.get("port")
    route_host = route.get("hostname")
    if route_name in expected and route_host != expected[route_name]:
        raise SystemExit(f"prodctl route reconciliation left a stale {route_name} route")
    if route_host in expected.values() and expected.get(route_name) != route_host:
        raise SystemExit(f"prodctl route reconciliation assigned {route_host} to the wrong route")
for name, hostname in expected.items():
    matches = [
        route
        for route in routes
        if isinstance(route, dict) and route.get("port") == name and route.get("hostname") == hostname
    ]
    if len(matches) != 1:
        raise SystemExit(f"prodctl route reconciliation did not realize {name}:{hostname}")
PY
}

reconcile_prodctl_routes "$status_json"

# deploy.bash sends only the generated infrastructure archive. The prodctl
# broker installs the Quadlet, starts it, and returns only after /version is
# healthy. It also preserves the app's existing volume and app-owned env.
[[ -f "$SCRIPT_DIR/deploy.bash" ]] || { echo "error: $SCRIPT_DIR/deploy.bash is required" >&2; exit 1; }
bash "$SCRIPT_DIR/deploy.bash"

# The broker exposes only this fixed, app-scoped credential operation. Keep its
# result in memory and pass it over a file descriptor, never as an argument or
# diagnostic output.
admin_key="$(prodctl credential "$APP" --convex-admin-key)" || {
  echo "error: could not retrieve the Convex admin key for $APP" >&2
  exit 1
}
if [[ -z "$admin_key" || "$admin_key" == *$'
'* || "$admin_key" == *$''* ]]; then
  unset admin_key
  echo "error: prodctl returned an invalid Convex admin key" >&2
  exit 1
fi

python3 - "$ENV_FILE" "https://eventoren.contentoren.de" "https://eventoren-convex.contentoren.de" "https://eventoren-api.contentoren.de" \
  3<<<"$admin_key" <<'PY'
import os
import re
import secrets
import sys
import tempfile
from pathlib import Path

environment_path, site_url, convex_url, api_url = sys.argv[1:]
raw_key = os.fdopen(3, "rb").read()
if not raw_key.endswith(b"\n"):
    raise SystemExit("invalid Convex admin key handoff")
try:
    admin_key = raw_key[:-1].decode("utf-8")
except UnicodeDecodeError:
    raise SystemExit("invalid Convex admin key handoff")
if not admin_key or any(character in admin_key for character in "\x00\r\n"):
    raise SystemExit("invalid Convex admin key handoff")

target = Path(environment_path)
parent = target.parent
if parent.is_symlink():
    raise SystemExit("production environment directory must not be a symlink")
parent.mkdir(mode=0o700, parents=True, exist_ok=True)
if not parent.is_dir():
    raise SystemExit("production environment directory must be a directory")
os.chmod(parent, 0o700)

if target.is_symlink():
    raise SystemExit("production environment must not be a symlink")
if target.exists() and not target.is_file():
    raise SystemExit("production environment must be a regular file")

current = target.read_text(encoding="utf-8") if target.exists() else ""
assignment = re.compile(r"^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=")
existing_admin_key = ""
placeholder_values = {"", "''", '""', "replace-with-production-admin-key"}
for line in current.splitlines():
    match = assignment.match(line)
    if match is None or match.group(1) != "CONVEX_SELF_HOSTED_ADMIN_KEY":
        continue
    candidate = line.split("=", 1)[1].strip()
    if candidate not in placeholder_values:
        existing_admin_key = candidate
        break
managed = {
    "PUBLIC_ENV_MODE": "production",
    "PUBLIC_BASE_URL_SITE": site_url,
    "PUBLIC_BASE_URL_APP": site_url,
    "PUBLIC_BASE_URL_CONVEX": convex_url,
    "PUBLIC_BASE_URL_API": api_url,
    "VITE_CONVEX_URL": convex_url,
    "VITE_CONVEX_SITE_URL": api_url,
    "CONVEX_SITE_URL": api_url,
    "CONVEX_SELF_HOSTED_URL": convex_url,
    "CONVEX_SELF_HOSTED_ADMIN_KEY": existing_admin_key or admin_key,
}
auth_secret = secrets.token_hex(32)
managed["AUTH_SECRET"] = auth_secret
seen = set()
lines = current.splitlines(keepends=True)
for index, line in enumerate(lines):
    ending = "\r\n" if line.endswith("\r\n") else "\n" if line.endswith("\n") else ""
    body = line[:-len(ending)] if ending else line
    match = assignment.match(body)
    if match is None:
        continue
    name = match.group(1)
    if name not in managed:
        continue
    if name in seen:
        raise SystemExit("production environment contains a duplicate managed setting")
    seen.add(name)
    if name == "AUTH_SECRET" and body.split("=", 1)[1].strip() not in {
        "",
        "''",
        '""',
        "replace-with-production-secret",
    }:
        continue
    lines[index] = f"{name}={managed[name]}{ending}"

if lines and not lines[-1].endswith(("\n", "\r")):
    lines.append("\n")
for name, value in managed.items():
    if name not in seen:
        lines.append(f"{name}={value}\n")

temporary = None
try:
    temporary = tempfile.NamedTemporaryFile(
        dir=parent,
        prefix=f".{target.name}.",
        mode="w",
        encoding="utf-8",
        delete=False,
    )
    temporary_path = Path(temporary.name)
    os.chmod(temporary_path, 0o600)
    temporary.write("".join(lines))
    temporary.flush()
    os.fsync(temporary.fileno())
    temporary.close()
    os.replace(temporary_path, target)
    os.chmod(target, 0o600)
    temporary = None
finally:
    if temporary is not None:
        temporary.close()
        Path(temporary.name).unlink(missing_ok=True)
PY
unset admin_key
chmod 600 "$ENV_FILE"
status_json="$(prodctl status "$APP" --json)"
allocated_ports="$(python3 - "$status_json" <<'PY'
import json
import sys

try:
    status = json.loads(sys.argv[1])
    ports = status["ports"]
    convex_port = ports["convex"]
    api_port = ports["api"]
except (KeyError, TypeError, ValueError, json.JSONDecodeError, IndexError):
    raise SystemExit("prodctl status did not return named Convex/API ports")
if (
    isinstance(convex_port, bool)
    or not isinstance(convex_port, int)
    or isinstance(api_port, bool)
    or not isinstance(api_port, int)
    or convex_port < 1
    or convex_port > 65535
    or api_port < 1
    or api_port > 65535
    or convex_port == api_port
):
    raise SystemExit("prodctl returned invalid or non-distinct Convex/API ports")
print(convex_port, api_port)
PY
)"
read -r convex_port api_port <<<"$allocated_ports"
[[ "$convex_port" =~ ^[0-9]+$ && "$api_port" =~ ^[0-9]+$ ]] || {
  echo "error: prodctl returned invalid Convex/API ports" >&2
  exit 1
}

REGISTRY_OWNER='leo'
REGISTRY_PROJECT_NAME='eventoren'
: "${REGISTRY_OWNER:?Project Registry owner is required}"
: "${REGISTRY_PROJECT_NAME:?Project Registry project name is required}"
command -v project-registry >/dev/null 2>&1 || { echo "error: project-registry is required for grouped backend registration" >&2; exit 1; }
REGISTRY_SOCKET="${PROJECT_REGISTRY_SOCKET:-/run/project-registry/$REGISTRY_OWNER.sock}"

# The CLI uses USER only to select the API owner. The Unix socket remains the
# authentication boundary; it must be the configured socket or the socket for
# the configured owner. Do not infer the project identity from the invoking
# process user.
registry_cli() {
  USER="$REGISTRY_OWNER" PROJECT_REGISTRY_SOCKET="$REGISTRY_SOCKET" project-registry "$@"
}

registry_cli project get "$REGISTRY_PROJECT_NAME" >/dev/null 2>&1 || {
  echo "error: main Project Registry project $REGISTRY_OWNER/$REGISTRY_PROJECT_NAME must exist" >&2
  exit 1
}

# Each project-registry edit performs its own canonical GET -> PATCH with an
# expected revision. If another recipe-owned or unrelated update wins between
# those requests, start a fresh CLI invocation so it rereads the project and
# preserves the current sibling services. Retry only that optimistic-conflict
# contract; all other failures remain terminal.
registry_project_edit() {
  local service="$1" port="$2" host="$3" output="" attempt
  for attempt in 1 2 3; do
    if output="$(registry_cli project edit "$REGISTRY_PROJECT_NAME" --service "$service" --port "$port" --domain "$host" --kind proxy --access external --ownership external --no-docs --no-browse --enabled 2>&1)"; then
      printf '%s\n' "$output"
      return 0
    fi
    if [[ "$output" != *"revision mismatch"* &&
      "$output" != *"revision conflict"* &&
      "$output" != *"revision changed during mutation"* &&
      "$output" != *"stale revision"* ]]; then
      printf '%s\n' "$output" >&2
      return 1
    fi
    if [[ "$attempt" -eq 3 ]]; then
      printf '%s\n' "$output" >&2
      return 1
    fi
  done
}

registry_project_edit convex "$convex_port" "eventoren-convex.contentoren.de"
registry_project_edit api "$api_port" "eventoren-api.contentoren.de"

echo "Production Convex infrastructure is ready; .env.production is configured"
