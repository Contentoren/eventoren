#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
CONFIG_DIR="${XDG_CONFIG_HOME:-$HOME/.config}"
USER_UNIT_DIR="$CONFIG_DIR/systemd/user"
HOME_LINK="$HOME/eventoren"
SELECTED_UNIT="$SCRIPT_DIR/eventoren-vite.service"
SELECTED_UNIT_NAME="eventoren-vite.service"
SELECTED_UNIT_LINK="$USER_UNIT_DIR/$SELECTED_UNIT_NAME"
ALTERNATE_UNIT_NAME="eventoren-rsbuild.service"
ALTERNATE_UNIT_LINK="$USER_UNIT_DIR/$ALTERNATE_UNIT_NAME"

usage() {
  cat <<EOF
Usage: $(basename "$0") [install|update|status|restart]

  install   Link the selected unit, reload user-systemd, and enable/start it
  update    Same as install
  status    Show the selected unit status
  restart   Restart the selected unit, then show status
EOF
}

require_selected_unit() {
  [[ -f "$SELECTED_UNIT" && ! -L "$SELECTED_UNIT" ]] || {
    echo "error: selected unit file is missing or not a regular file: $SELECTED_UNIT" >&2
    return 1
  }
}

home_link_validate() {
  if [[ -L "$HOME_LINK" ]]; then
    local current
    current="$(readlink -f "$HOME_LINK" 2>/dev/null || true)"
    if [[ "$current" != "$REPO_DIR" ]]; then
      echo "error: $HOME_LINK is an unrelated symlink; refusing to replace" >&2
      return 1
    fi
    return 0
  fi

  if [[ -e "$HOME_LINK" ]]; then
    if [[ -d "$HOME_LINK" ]]; then
      local current_home current_repo
      current_home="$(readlink -f "$HOME_LINK" 2>/dev/null || true)"
      current_repo="$(readlink -f "$REPO_DIR" 2>/dev/null || true)"
      if [[ -n "$current_home" && "$current_home" == "$current_repo" ]]; then
        return 0
      fi
    fi
    echo "error: $HOME_LINK exists and is not a symlink; refusing to replace" >&2
    return 1
  fi
}

user_unit_directory_validate() {
  if [[ -L "$USER_UNIT_DIR" || ( -e "$USER_UNIT_DIR" && ! -d "$USER_UNIT_DIR" ) ]]; then
    echo "error: $USER_UNIT_DIR exists and is not a regular directory; refusing to use" >&2
    return 1
  fi
}

unit_link_validate() {
  local unit_link="$1"
  local expected_unit="$2"
  local description="$3"

  if [[ ! -e "$unit_link" && ! -L "$unit_link" ]]; then return 0; fi
  if [[ ! -L "$unit_link" ]]; then
    echo "error: $unit_link exists and is not a symlink; refusing to replace $description" >&2
    return 1
  fi

  local current
  current="$(readlink -f "$unit_link" 2>/dev/null || true)"
  if [[ "$current" != "$expected_unit" ]]; then
    echo "error: $unit_link is an unrelated symlink; refusing to replace $description" >&2
    return 1
  fi
}

preview_web_register() {
  command -v project-registry >/dev/null 2>&1 || {
    echo "error: project-registry is required to register the local preview web service" >&2
    return 1
  }
  command -v python3 >/dev/null 2>&1 || {
    echo "error: python3 is required to read the allocated preview web port" >&2
    return 1
  }

  local registry_owner='leo'
  local registry_project_name='eventoren'
  local preview_host='preview.eventoren.leonardomora.de'
  local registry_socket="${PROJECT_REGISTRY_SOCKET:-/run/project-registry/$registry_owner.sock}"
  local project_json allocated_values preview_web_port default_web_port default_has_preview

  registry_cli() {
    USER="$registry_owner" PROJECT_REGISTRY_SOCKET="$registry_socket" project-registry "$@"
  }

  project_json="$(registry_cli --json project get "$registry_project_name")" || {
    echo "error: Project Registry project $registry_owner/$registry_project_name could not be read" >&2
    return 1
  }
  allocated_values="$(python3 - "$project_json" "$registry_owner" "$registry_project_name" "$preview_host" <<'PY'
import json
import sys

payload = json.loads(sys.argv[1])
if payload.get("success") is not True:
    raise SystemExit("Project Registry returned an unsuccessful project response")
data = payload.get("data")
rows = data if isinstance(data, list) else [data]
rows = [row for row in rows if isinstance(row, dict)]
if not rows or any(row.get("user") != sys.argv[2] or row.get("name") != sys.argv[3] for row in rows):
    raise SystemExit("Project Registry returned a different project identity")

preview = next((row for row in rows if row.get("service") == "preview-web"), None)
default = next((row for row in rows if row.get("service") == "default"), None)
# A pre-existing preview-web owns its allocated port. On first install, reuse
# the Pages default's registry metadata port; external services do not reserve
# local routing ports, and this avoids inventing a project-wide tool default.
preview_port = preview.get("port") if preview is not None else None
default_port = default.get("port") if default is not None else None
preview_port = preview_port if preview_port is not None else default_port
if isinstance(preview_port, bool) or not isinstance(preview_port, int) or preview_port < 1 or preview_port > 65535:
    raise SystemExit("Project Registry must provide an allocated preview-web or default service port")
default_domains = default.get("domains", []) if default is not None else []
has_preview = sys.argv[4] in default_domains
if has_preview and (
    isinstance(default_port, bool)
    or not isinstance(default_port, int)
    or default_port < 1
    or default_port > 65535
):
    raise SystemExit("Project Registry must provide the default service port while migrating its preview route")
print(preview_port, default_port if has_preview else 0, int(has_preview))
PY
  )" || return 1
  read -r preview_web_port default_web_port default_has_preview <<<"$allocated_values"
  [[ "$preview_web_port" =~ ^[0-9]+$ ]] || {
    echo "error: Project Registry returned an invalid preview web port" >&2
    return 1
  }

  registry_project_edit() {
    local service="$1" port="$2"
    shift 2
    local output="" attempt
    for attempt in 1 2 3; do
      if output="$(registry_cli project edit "$registry_project_name" --service "$service" --port "$port" "$@" 2>&1)"; then
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

  if [[ "$default_has_preview" == 1 ]]; then
    registry_project_edit default "$default_web_port" --domain 'eventoren.contentoren.de' --kind static --access external --ownership external || {
      echo "error: could not migrate the default preview route to preview-web" >&2
      return 1
    }
  fi
  registry_project_edit preview-web "$preview_web_port" --domain "$preview_host" --kind proxy --access external --ownership registry --no-docs --no-browse --enabled || {
    echo "error: could not register preview-web in the grouped Project Registry project" >&2
    return 1
  }

  local config_dir="$HOME/.config/eventoren"
  mkdir -p "$config_dir"
  local temporary
  temporary="$(mktemp "$config_dir/.preview-web.env.XXXXXX")"
  umask 077
  printf 'PREVIEW_WEB_PORT=%s\n' "$preview_web_port" >"$temporary"
  chmod 600 "$temporary"
  mv "$temporary" "$config_dir/preview-web.env"
}


validate_install_paths() {
  require_selected_unit || return 1
  home_link_validate || return 1
  user_unit_directory_validate || return 1
  unit_link_validate "$SELECTED_UNIT_LINK" "$SELECTED_UNIT" "the selected unit" || return 1
  unit_link_validate "$ALTERNATE_UNIT_LINK" "$SCRIPT_DIR/$ALTERNATE_UNIT_NAME" "the alternate unit" || return 1
}

ensure_home_link() {
  if [[ ! -e "$HOME_LINK" && ! -L "$HOME_LINK" ]]; then
    ln -s "$REPO_DIR" "$HOME_LINK"
  fi
}

remove_alternate_unit() {
  local disable_output
  if disable_output="$(systemctl --user disable --now "$ALTERNATE_UNIT_NAME" 2>&1)"; then
    :
  else
    local disable_status="$?"
    local load_state
    load_state="$(systemctl --user show "$ALTERNATE_UNIT_NAME" --property=LoadState --value 2>/dev/null)" || {
      echo "error: failed to disable the alternate unit: $ALTERNATE_UNIT_NAME${disable_output:+ ($disable_output)}" >&2
      return "$disable_status"
    }
    if [[ "$load_state" != "not-found" ]]; then
      echo "error: failed to disable the alternate unit: $ALTERNATE_UNIT_NAME${disable_output:+ ($disable_output)}" >&2
      return "$disable_status"
    fi
  fi
  if [[ -L "$ALTERNATE_UNIT_LINK" ]]; then rm "$ALTERNATE_UNIT_LINK"; fi
}

install_selected_unit() {
  if [[ ! -e "$SELECTED_UNIT_LINK" && ! -L "$SELECTED_UNIT_LINK" ]]; then
    ln -s "$SELECTED_UNIT" "$SELECTED_UNIT_LINK"
  fi
}

install_or_update() {
  local mode="$1"
  validate_install_paths || exit 1
  preview_web_register || exit 1
  loginctl enable-linger "$USER"
  ensure_home_link
  mkdir -p "$USER_UNIT_DIR"
  remove_alternate_unit
  install_selected_unit
  systemctl --user daemon-reload
  systemctl --user reset-failed "$SELECTED_UNIT_NAME" 2>/dev/null || true
  systemctl --user enable --now "$SELECTED_UNIT_NAME"
  echo "Done ($mode): $SELECTED_UNIT_NAME is installed, enabled, and started."
}

show_status() {
  require_selected_unit
  echo "is-enabled: $(systemctl --user is-enabled "$SELECTED_UNIT_NAME" 2>/dev/null || true)"
  echo "is-active:  $(systemctl --user is-active "$SELECTED_UNIT_NAME" 2>/dev/null || true)"
  systemctl --user status "$SELECTED_UNIT_NAME" --no-pager || true
}

restart_selected() {
  require_selected_unit
  systemctl --user restart "$SELECTED_UNIT_NAME"
  show_status
}

case "${1:-install}" in
  install|update) install_or_update "${1:-install}" ;;
  status) show_status ;;
  restart) restart_selected ;;
  -h|--help|help) usage ;;
  *) echo "error: unknown command: $1" >&2; usage >&2; exit 1 ;;
esac
