#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

# Production remains the default, with its existing key set and env file.
# Preview may override development origins in an ignored .env.pages.preview,
# but only after its callback has been verified in the existing Zitadel client.
PAGES_ENV="${1:-production}"
case "$PAGES_ENV" in
  production)
    ENV_FILES=(--env-file=.env.production)
    UNSET_KEYS=()
    ;;
  preview)
    ENV_FILES=(--env-file=.env.development)
    if [[ -f .env.pages.preview ]]; then
      ENV_FILES+=(--env-file=.env.pages.preview)
    fi
    UNSET_KEYS=(-u AUTH_SECRET -u OIDC_ZITADEL_ORG_ID -u ZITADEL_PROJECT_ID -u ZITADEL_CLIENT_ID -u ZITADEL_CLIENT_SECRET -u ZITADEL_ISSUER -u PUBLIC_BASE_URL_APP -u ZITADEL_REDIRECT_URI)
    ;;
  *) printf 'Usage: %s [production|preview]\n' "$0" >&2; exit 2 ;;
esac
if [[ $# -gt 1 ]]; then
  printf 'Usage: %s [production|preview]\n' "$0" >&2
  exit 2
fi

# Clear every allowlisted key before loading the selected env file. Inherited
# values otherwise take precedence over dotenv files (including auth settings).
# Explicit allowlist: never forward backend callback or early-SEPA secrets.
# shellcheck disable=SC2016 # JavaScript template strings, not shell expansions.
env -u CONVEX_SITE_URL -u VITE_CONVEX_SITE_URL -u PUBLIC_BASE_URL_API -u PUBLIC_BASE_URL_CONVEX -u VITE_CONVEX_URL -u AUTH_SECRET -u OIDC_ZITADEL_ORG_ID -u ZITADEL_PROJECT_ID "${UNSET_KEYS[@]}" PAGES_SYNC_ENV="$PAGES_ENV" bun "${ENV_FILES[@]}" -e '
  import { spawnSync } from "node:child_process"
  const preview = process.env.PAGES_SYNC_ENV === "preview"
  const label = preview ? "Preview" : "Production"
  const keys = [
    "CONVEX_SITE_URL",
    "VITE_CONVEX_SITE_URL",
    "PUBLIC_BASE_URL_API",
    "PUBLIC_BASE_URL_CONVEX",
    "VITE_CONVEX_URL",
    "AUTH_SECRET",
    "OIDC_ZITADEL_ORG_ID",
    "ZITADEL_PROJECT_ID",
  ]
  if (preview) keys.push(
    "ZITADEL_CLIENT_ID",
    "ZITADEL_CLIENT_SECRET",
    "ZITADEL_ISSUER",
    "PUBLIC_BASE_URL_APP",
    "ZITADEL_REDIRECT_URI",
  )
  for (const key of keys) {
    const value = process.env[key]
    if (!value) throw new Error(`${label} ${key} is required`)
    if (["CONVEX_SITE_URL", "VITE_CONVEX_SITE_URL", "PUBLIC_BASE_URL_API", "PUBLIC_BASE_URL_CONVEX", "VITE_CONVEX_URL", "PUBLIC_BASE_URL_APP", "ZITADEL_ISSUER"].includes(key)) {
      let origin
      try { origin = new URL(value) } catch { throw new Error(`${label} ${key} must be an HTTPS origin`) }
      if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/") {
        throw new Error(`${label} ${key} must be an HTTPS origin`)
      }
      if (preview && (origin.search || origin.hash)) throw new Error(`${label} ${key} must be an HTTPS origin`)
    }
    if (preview && key === "ZITADEL_REDIRECT_URI") {
      const expected = `${new URL(process.env.PUBLIC_BASE_URL_APP).origin}/login/zitadel/callback`
      if (value !== expected) throw new Error("Preview ZITADEL_REDIRECT_URI must match the app callback")
    }
  }
  for (const key of keys) {
    const args = ["wrangler", "pages", "secret", "put", key, "--project-name", "eventoren"]
    if (preview) args.push("--env", "preview")
    const result = spawnSync("bunx", args, {
      input: process.env[key],
      stdio: ["pipe", "inherit", "inherit"],
    })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
'
