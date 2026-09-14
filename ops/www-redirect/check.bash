#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
REDIRECTS_FILE="$REPO_DIR/src/www-redirect/_redirects"
EXPECTED_RULE='https://www.eventoren.contentoren.de/* https://eventoren.contentoren.de/:splat 301'

regular_file_require() {
  local path="$1"
  [[ -f "$path" && ! -L "$path" ]] || { echo "error: expected a regular file: $path" >&2; exit 1; }
}

regular_file_require "$REDIRECTS_FILE"

if [[ "$(cat "$REDIRECTS_FILE")" != "$EXPECTED_RULE" ]]; then
  echo "error: src/www-redirect/_redirects must contain exactly: $EXPECTED_RULE" >&2
  exit 1
fi

if ! command -v curl >/dev/null 2>&1; then
  echo "error: curl is required to verify the live WWW redirect" >&2
  exit 1
fi

CHECK_URL="${WWW_REDIRECT_CHECK_URL:-https://www.eventoren.contentoren.de/some/path?param=1}"
EXPECTED_LOCATION="${WWW_REDIRECT_EXPECTED_LOCATION:-https://eventoren.contentoren.de/some/path?param=1}"
STATUS="$(curl --silent --show-error --head --output /dev/null --write-out '%{http_code}' "$CHECK_URL")"
LOCATION="$(curl --silent --show-error --head --output /dev/null --write-out '%{redirect_url}' "$CHECK_URL")"
if [[ "$STATUS" != "301" || "$LOCATION" != "$EXPECTED_LOCATION" ]]; then
  echo "error: $CHECK_URL must return HTTP 301 with Location: $EXPECTED_LOCATION (got $STATUS, $LOCATION)" >&2
  exit 1
fi

if [[ "$(find "$REPO_DIR/src/www-redirect" -mindepth 1 | wc -l)" -ne 1 ]]; then
  echo "error: the src/www-redirect artifact must contain only _redirects" >&2
  exit 1
fi

if ! command -v bun >/dev/null 2>&1; then
  echo "error: bun is required to inspect package scripts" >&2
  exit 1
fi

cd "$REPO_DIR"
REDIRECT_PROJECT_NAME=eventoren-www-redirect SITE_PROJECT_NAME=eventoren bun -e '
const pkg = JSON.parse(await Bun.file("package.json").text())
const scripts = pkg.scripts ?? {}
const redirectProject = process.env.REDIRECT_PROJECT_NAME
const siteProject = process.env.SITE_PROJECT_NAME
const expected = {
  "www-redirect:create": "bunx wrangler pages project create " + redirectProject + " --production-branch=main",
  "deploy:www-redirect":
    "bunx wrangler pages deploy . --cwd src/www-redirect --project-name " +
    redirectProject +
    " --branch main --commit-dirty=true",
  "www-redirect:check": "bash ops/www-redirect/check.bash",
}
for (const [name, command] of Object.entries(expected)) {
  if (scripts[name] !== command) throw new Error("package.json script mismatch: " + name)
}
if (redirectProject === siteProject) throw new Error("the redirect project must be separate from the site project")
if ((scripts["frontend:upload"] ?? "").includes(redirectProject)) {
  throw new Error("the site upload script must not deploy the redirect project")
}
for (const [name, command] of Object.entries(scripts)) {
  if (typeof command === "string" && /pages\s+(domain|deployment\s+domain)/u.test(command)) {
    throw new Error("setup scripts must not mutate custom domains: " + name)
  }
}
'

echo "Verified the eventoren-www-redirect redirect artifact and live eventoren.contentoren.de redirect."
