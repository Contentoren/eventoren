# Eventoren local migration rehearsal

Private, egress-isolated rehearsal of the current schema against a production
data snapshot. Production access is read-only (`convex export`); there are no
production runs, mutations, cleanups, deploys, or e2e executions.

## Ownership and boundaries

- New files only: `ops/convex/local-rehearsal/**`, `scripts/localRehearsal*.ts`.
- Private artifacts only outside git: `${LOCAL_REHEARSAL_STATE_ROOT:-~/.local/state/eventoren/local-rehearsal}`.
- No edits to `package.json`, shared runtime sources, or deployed services.
- `node_modules` and `convex/_generated` in this worktree are an independent
  copied baseline (`cp -a --reflink=auto`); never symlinked to main.
- Backend schema may move under other agents; re-baseline from the current
  clean commit and only re-run read-only codegen if tests/types require it.

## Ports, identity, isolation

- Rehearsal backend: `127.0.0.1:13470` (Convex) and `127.0.0.1:13471` (site proxy).
- Shared ports are forbidden everywhere: `3210/3211` (host defaults),
  `3234/3235` (preview), `6791` (dashboard), `8320/8321` (production).
  The loopback guard accepts only the literal `127.0.0.1` (no `localhost` DNS,
  no IPv6 spellings), `http` only, explicit port, no path/query/credentials.
- Target identity: `eventoren-local-rehearsal` (live backend env plus
  `$STATE_ROOT/target-identity.txt`; restore runs the identity guard against
  the live backend value and refuses anything else).
- Backend image is pinned by digest, never `:latest`:
  `ghcr.io/get-convex/convex-backend@sha256:f0de0647e46c0ac830a6dda036ee78e4956cecc00144d951bf39b14cc570ad4d`.
- Podman network: internal-only `eventoren-local-rehearsal`; verify proves the
  container's exact sole network is that network and every published bind is
  `127.0.0.1`. UDF `fetch` is unrestricted inside the backend process, so the
  internal network is the containment boundary and it is verified, not assumed.
- Admin key: derived inside the running container
  (`podman exec <container> ./generate_admin_key.sh`) into `cli.env` (0600).
  No placeholders: `up` fails unless the derived key authenticates the local
  backend via `convex data`; `verify` re-proves it and pins `cli.env` to the
  exact local URL. Inherited `CONVEX_*` env is cleared in every script so a
  production selection can never leak in.
- Blocked from the rehearsal backend env, the real Convex UDF env, and
  `runtime.env`: billing/payment, Stripe, SMTP/Resend/Mailjet, Zitadel/SSO,
  R2/S3, remote database URLs, Sentry, and any `CONVEX_DEPLOYMENT`/
  `CONVEX_DEPLOY_KEY`. Verify prefix-matches full variable names on the
  actual container env, lists UDF names via the authenticated local cli.env
  (names only, fail-closed), and fails the gate on a missing `runtime.env`.
- Snapshot gate (names only): the zip must resolve (realpath) under the
  canonical state root, be a non-symlink regular file, and be `chmod 600`.
  Any `_storage/`, `*schedul*`, `*cron*`, or `_system/` entry refuses the
  restore. The table-set comparison after restore proves no system tables
  appeared.
- Functions deploy only from the private staging root with an empty cron
  registry (source gate before and after deploy); the deployed UDF env holds
  only the local-only set, and the internal podman network stays the sole
  egress boundary. Functions may schedule internal actions, but provider
  credentials are absent and egress is denied, so no outside effects occur.

## Status (evidence-backed, no aspirations)

- VERIFIED: guards `bun test scripts/localRehearsalLoopbackValidate.test.ts scripts/localRehearsalGuards.test.ts` (10 pass,
  incl. resource-namespace, suffixed credential names, and port override cases).
- VERIFIED: network `eventoren-local-rehearsal` is `internal: true` with the
  rehearsal backend as its sole container; all publishes bind `127.0.0.1`.
- VERIFIED: keygen derivation (`generate_admin_key.sh` in-container) yields a
  key the backend accepts; `convex data` authenticates, bogus keys are
  rejected with "invalid for this instance".
- VERIFIED: snapshot `snapshots/prod-20261020.zip` holds 68 entries across 34
  data tables, with no scheduled/cron/system/storage entries (names only).
  The private original snapshot is preserved; the initial 34-table/1250-doc
  count comparison remains the baseline (later local tests add records).
- VERIFIED: export path is read-only (`convex export` with an explicit private
  prod env file; refuses to overwrite; no deploy/run/mutation surface).
- VERIFIED: `bootstrap.bash up` recreated the backend from the pinned digest,
  derived the real admin key in-container, and authenticated it; `verify`
  exits 0 (internal sole network, 127.0.0.1-only binds, pinned digest, live
  identity, authenticated cli.env, side-effect-free container env + UDF env +
  runtime.env). Verify additionally pins resource-name namespace allowlisting,
  integer/range/forbidden port checks on every path, and validate-before-mkdir
  state-root handling; adversarial overrides were probed and refused.
- VERIFIED: `restore.bash --path snapshots/prod-20261020.zip --replace-all --yes`
  imported 1250 documents; per-table counts and sorted-ID hashes match the
  snapshot on all 34 tables (1283 docs incl. `_tables`); backend logs contain
  0 cron/scheduler mentions; re-export kept private at
  `verify/reexport-20261020T120136Z.zip` (0600).
- VERIFIED: `stage-deploy.bash prepare` stages the current wrappers privately
  at `staging/rehearsal-functions` (19 root wrappers + schema copied, real
  `crons.ts` replaced with an empty registry, `src`/`ui`/`node_modules`
  symlinked read-only, independent `_generated`, hash manifest).
- VERIFIED: `stage-deploy.bash deploy` pushed 192 functions (85 mutations, 64
  queries, 19 actions, 22 HTTP actions across 20 modules, incl. the current
  organizerDashboard/Admin/Events/Migration wrappers) to
  `http://127.0.0.1:13470` with an empty cron registry (source gate before
  AND after deploy, 0 backend-log cron/scheduler mentions). UDF env is
  exactly the local-only set (AUTH_SECRET rotated per deploy, loopback
  PUBLIC_BASE_URL_*, PUBLIC_ENV_MODE, CONVEX_REHEARSAL_MODE=local); no
  production env was read or copied. Internal network remains the sole
  egress boundary before and after deploy.
- VERIFIED: `stage-deploy.bash fixtures` created 2 synthetic users (customer +
  admin) and 2 authSessions via the staging-only `rehearsalFixtures` module
  (explicit marker + local UDF marker required; distinctive
  `@invalid.local` emails; copied production rows untouched). Tokens live
  only in `staging/fixture-tokens.json` (0600, never logs); both tokens
  authenticate via `auth:authCurrentUserGetQuery` with the correct roles.
- TODO: migration/E2E against the rehearsed data (parent scope; out of this
  rehearsal lane).

## Runbook

```bash
cd /home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard

# 1. Guards first (no runtime needed)
bun test scripts/localRehearsalLoopbackValidate.test.ts scripts/localRehearsalGuards.test.ts

# 2. Bring up the isolated backend (loopback-only, internal network, real key)
bash ops/convex/local-rehearsal/bootstrap.bash up
bash ops/convex/local-rehearsal/bootstrap.bash verify

# 3. Read-only production export (only after verify passes)
bash ops/convex/local-rehearsal/export.bash --verify-flags
bash ops/convex/local-rehearsal/export.bash \
  --path "$HOME/.local/state/eventoren/local-rehearsal/snapshots/prod-<date>.zip" \
  --prod-env "$HOME/<private-path-outside-git>/prod-export.env"

# 4. Restore into the local backend only (verify + guards + snapshot gates first)
bash ops/convex/local-rehearsal/restore.bash \
  --path "$HOME/.local/state/eventoren/local-rehearsal/snapshots/prod-<date>.zip" \
  --replace-all --yes

# 5. Deploy the current wrappers with cron registration DISABLED, configure
# local-only UDF env, and create synthetic fixtures (all private, all gated
# by a fresh verify before and after; rerun prepare+deploy after workers
# change wrappers)
bash ops/convex/local-rehearsal/stage-deploy.bash prepare
bash ops/convex/local-rehearsal/stage-deploy.bash deploy
bash ops/convex/local-rehearsal/stage-deploy.bash status
bash ops/convex/local-rehearsal/stage-deploy.bash fixtures

# 6. Tear down the container when done (volume/network/staging stay private)
bash ops/convex/local-rehearsal/bootstrap.bash down
```

## Local frontend env (recommendations for browser tests; write to a private
`.env.local` outside git, never into the repo)

```bash
VITE_CONVEX_URL=http://127.0.0.1:13470
VITE_CONVEX_SITE_URL=http://127.0.0.1:13471
CONVEX_SELF_HOSTED_URL=http://127.0.0.1:13470
# CONVEX_SELF_HOSTED_ADMIN_KEY: read from
# ~/.local/state/eventoren/local-rehearsal/cli.env (0600) at test time;
# never paste it into shared files or logs.
# Auth tokens: read from
# ~/.local/state/eventoren/local-rehearsal/staging/fixture-tokens.json (0600)
# at test time; production tokens cannot validate under the local secret.
```

No shared E2E commands are run from this lane; browser/backend migration
tests consume the deployed functions and the fixture file above.

## Frontend startup against the rehearsal backend (SSR auth)

`stage-deploy.bash deploy` rotates the backend `AUTH_SECRET` per deploy and
now syncs `$STATE_ROOT/runtime.env` to it (pre-check before the rotation,
sync after the UDF set, temp secret deleted). The SSR frontend (`/api/session`
via `eventorenBrowserSessionRead`) only verifies fixture JWTs when it runs
with that same secret, so after every deploy restart the worktree Vite:

```bash
cd /home/leo/.t3code-david/worktrees/eventoren/feature-veranstalter-dashboard
nohup env -i PATH="$PATH" HOME="$HOME" \
  PUBLIC_ENV_MODE=development \
  PUBLIC_BASE_URL_SITE=http://127.0.0.1:13557 \
  PUBLIC_BASE_URL_APP=http://127.0.0.1:13557 \
  PUBLIC_BASE_URL_API=http://127.0.0.1:13471 \
  PUBLIC_BASE_URL_CONVEX=http://127.0.0.1:13470 \
  VITE_CONVEX_URL=http://127.0.0.1:13470 \
  VITE_SITE_URL=http://127.0.0.1:13471 \
  bun --env-file="$HOME/.local/state/eventoren/local-rehearsal/runtime.env" \
  run dev --host 127.0.0.1 --port 13557 --strictPort \
  >>/tmp/eventoren-dashboard-verification/vite.log 2>&1 &
echo $! >/tmp/eventoren-dashboard-verification/vite.pid
```

Never copy `.env.production`/shared env files; the secret travels only via
`--env-file` + `runtime.env` (0600), never argv. If the frontend was started
before a deploy (stale placeholder secret), re-sync without rotating via
`stage-deploy.bash auth-sync-only` and restart Vite. Auth proof is an HTTP
probe, not a browser: backend `auth:authCurrentUserGetQuery` plus frontend
`GET /api/session` with the `eventoren-session` fixture cookie must return the
same `userId` as `staging/fixture-tokens.json` for customer and admin.

`export.bash --path` and `restore.bash --path` must both stay under the private
state root. Report only the private snapshot path, local ports, target identity,
and table/document counts; never snapshot contents, secrets, or PII.
