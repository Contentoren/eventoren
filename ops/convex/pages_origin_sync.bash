#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_DIR"

# Pages runtime secrets survive deployments and can outlive an origin migration.
# Match them to the same production file used by the frontend build.
env -u CONVEX_SITE_URL -u VITE_CONVEX_SITE_URL -u PUBLIC_BASE_URL_API -u PUBLIC_BASE_URL_CONVEX -u VITE_CONVEX_URL bun --env-file=.env.production -e '
  import { spawnSync } from "node:child_process"
  for (const key of [
    "CONVEX_SITE_URL",
    "VITE_CONVEX_SITE_URL",
    "PUBLIC_BASE_URL_API",
    "PUBLIC_BASE_URL_CONVEX",
    "VITE_CONVEX_URL",
    "AUTH_SECRET",
    "OIDC_ZITADEL_ORG_ID",
  ]) {
    const value = process.env[key]
    if (!value) throw new Error(`Production ${key} is required`)
    if (["CONVEX_SITE_URL", "VITE_CONVEX_SITE_URL", "PUBLIC_BASE_URL_API", "PUBLIC_BASE_URL_CONVEX", "VITE_CONVEX_URL"].includes(key)) {
      const origin = new URL(value)
      if (origin.protocol !== "https:" || origin.username || origin.password || origin.pathname !== "/") {
        throw new Error(`Production ${key} must be an HTTPS origin`)
      }
    }
    const result = spawnSync("bunx", ["wrangler", "pages", "secret", "put", key, "--project-name", "eventoren"], {
      input: value,
      stdio: ["pipe", "inherit", "inherit"],
    })
    if (result.status !== 0) process.exit(result.status ?? 1)
  }
'
