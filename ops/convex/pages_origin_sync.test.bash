#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TEST_DIR="$(mktemp -d /tmp/opencode/pages-origin-sync.XXXXXX)"
trap 'rm -rf "$TEST_DIR"' EXIT
mkdir -p "$TEST_DIR/ops/convex" "$TEST_DIR/bin"
cp "$SCRIPT_DIR/pages_origin_sync.bash" "$TEST_DIR/ops/convex/"
export PAGES_SYNC_TEST_LOG="$TEST_DIR/calls"
export PAGES_SYNC_TEST_INPUTS="$TEST_DIR/inputs"
export PATH="$TEST_DIR/bin:$PATH"

# The only uploader is a mock; only test-fixture stdin values are captured.
cat > "$TEST_DIR/bin/bunx" <<'MOCK'
#!/usr/bin/env bash
set -euo pipefail
value=$(cat)
printf '%s\n' "$*" >> "$PAGES_SYNC_TEST_LOG"
printf '%s=%s\n' "$5" "$value" >> "$PAGES_SYNC_TEST_INPUTS"
MOCK
chmod +x "$TEST_DIR/bin/bunx"
cat > "$TEST_DIR/.env.development" <<'ENV'
CONVEX_SITE_URL=https://api.example.test
VITE_CONVEX_SITE_URL=https://api.example.test
PUBLIC_BASE_URL_API=https://api.example.test
PUBLIC_BASE_URL_CONVEX=https://convex.example.test
VITE_CONVEX_URL=https://convex.example.test
AUTH_SECRET=test-only-not-a-credential
OIDC_ZITADEL_ORG_ID=test-org
ZITADEL_PROJECT_ID=test-project
ZITADEL_CLIENT_ID=test-client
ZITADEL_CLIENT_SECRET=test-only-not-a-credential
ZITADEL_ISSUER=https://auth.example.test
PUBLIC_BASE_URL_APP=https://app.example.test
ZITADEL_REDIRECT_URI=https://app.example.test/login/zitadel/callback
EVENTOREN_BILLING_OUTCOME_SECRET=must-not-upload
ENV
cp "$TEST_DIR/.env.development" "$TEST_DIR/.env.production"
# Distinct dummy production auth values make inherited-value leakage observable.
sed -i \
  -e 's/^AUTH_SECRET=.*/AUTH_SECRET=production-test-auth/' \
  -e 's/^OIDC_ZITADEL_ORG_ID=.*/OIDC_ZITADEL_ORG_ID=production-test-org/' \
  -e 's/^ZITADEL_PROJECT_ID=.*/ZITADEL_PROJECT_ID=production-test-project/' \
  "$TEST_DIR/.env.production"
SCRIPT="$TEST_DIR/ops/convex/pages_origin_sync.bash"

# Default production retains its original eight keys and no environment flag.
AUTH_SECRET=poisoned-auth OIDC_ZITADEL_ORG_ID=poisoned-org ZITADEL_PROJECT_ID=poisoned-project bash "$SCRIPT"
[[ $(wc -l < "$PAGES_SYNC_TEST_LOG") -eq 8 ]]
if rg -q -- '--env|ZITADEL_CLIENT|PUBLIC_BASE_URL_APP|OUTCOME|SEPA' "$PAGES_SYNC_TEST_LOG"; then exit 1; fi
rg -q '^wrangler pages secret put AUTH_SECRET --project-name eventoren$' "$PAGES_SYNC_TEST_LOG"
rg -q '^AUTH_SECRET=production-test-auth$' "$PAGES_SYNC_TEST_INPUTS"
rg -q '^OIDC_ZITADEL_ORG_ID=production-test-org$' "$PAGES_SYNC_TEST_INPUTS"
rg -q '^ZITADEL_PROJECT_ID=production-test-project$' "$PAGES_SYNC_TEST_INPUTS"
if rg -q 'poisoned-' "$PAGES_SYNC_TEST_INPUTS"; then exit 1; fi

# Preview includes auth config, always targets preview, and clears inherited values.
: > "$PAGES_SYNC_TEST_LOG"
PUBLIC_BASE_URL_APP=https://wrong.example.test ZITADEL_REDIRECT_URI=wrong AUTH_SECRET=wrong bash "$SCRIPT" preview
[[ $(wc -l < "$PAGES_SYNC_TEST_LOG") -eq 13 ]]
[[ $(rg -c -- '--project-name eventoren --env preview$' "$PAGES_SYNC_TEST_LOG") -eq 13 ]]
if rg -q -- '--branch|OUTCOME|SEPA' "$PAGES_SYNC_TEST_LOG"; then exit 1; fi
for key in AUTH_SECRET OIDC_ZITADEL_ORG_ID ZITADEL_PROJECT_ID ZITADEL_CLIENT_ID ZITADEL_CLIENT_SECRET ZITADEL_ISSUER PUBLIC_BASE_URL_APP ZITADEL_REDIRECT_URI; do
  rg -q "secret put $key --project-name eventoren --env preview$" "$PAGES_SYNC_TEST_LOG"
done

# Optional ignored override and preflight validation prevent partial uploads.
cat > "$TEST_DIR/.env.pages.preview" <<'ENV'
PUBLIC_BASE_URL_APP=https://alias.example.test
ZITADEL_REDIRECT_URI=https://alias.example.test/login/zitadel/callback
ENV
: > "$PAGES_SYNC_TEST_LOG"
bash "$SCRIPT" preview
[[ $(wc -l < "$PAGES_SYNC_TEST_LOG") -eq 13 ]]
printf '\nZITADEL_REDIRECT_URI=https://wrong.example.test/login/zitadel/callback\n' >> "$TEST_DIR/.env.pages.preview"
: > "$PAGES_SYNC_TEST_LOG"
if bash "$SCRIPT" preview > /dev/null 2>&1; then exit 1; fi
[[ ! -s "$PAGES_SYNC_TEST_LOG" ]]
if bash "$SCRIPT" invalid > /dev/null 2>&1; then exit 1; fi
if bash "$SCRIPT" preview extra > /dev/null 2>&1; then exit 1; fi
[[ ! -s "$PAGES_SYNC_TEST_LOG" ]]
printf 'Pages origin sync scoped tests passed (mock uploads only).\n'
