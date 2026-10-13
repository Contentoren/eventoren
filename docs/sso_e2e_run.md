# SSO and checkout E2E runs

Run the production E2E workflows with:

```bash
bun run test:e2e
```

The production target runs SSO, native-auth HTTP, and native-auth lifecycle workflows. It does not run ticket purchase. Development/preview runs those workflows plus ticket purchase:

```bash
bun run test:e2e:dev
```

Ticket purchase is restricted to a safe development/preview target and uses the existing target checks and owned-resource reconciliation. For standalone SSO diagnostics, run `E2E_TARGET=development bunx rstest run --config e2e/rstest.config.ts`.

Credentials are resolved from the local `contentoren` Zitadel profile, or from paired `E2E_AUTH_USERNAME` and `E2E_AUTH_PASSWORD` overrides. Put local values in ignored `.env.e2e.local` (or select a file with `E2E_ENV_FILE`); never commit credentials. The SSO workflow verifies authenticated navigation links and does not mutate business data.

## Checkpoint ownership and target isolation

New runs keep private, target-bound state under `/tmp/opencode/eventoren/e2e/production` or `/tmp/opencode/eventoren/e2e/development`. If the preferred root is unavailable, the equivalent private fallback is `/tmp/eventoren-e2e-<uid>/e2e/<target>`. The invocation forwards its exact resolved directory to every child and cleanup-session evidence writer through `E2E_CHECKPOINT_DIRECTORY`.

A validated legacy checkpoint in the unscoped root stays in place and resumes only under its original target. A retained development payment attempt therefore does not redirect or block a separate production run. It is not deleted, retargeted, age-expired, or implicitly reconciled by a production pass. Corrupt/nonprivate state, orphan locks without target evidence, conflicting native-workflow identities, and multiple active roots for the same target still require manual reconciliation. Do not clear a payment checkpoint merely because its hosted Stripe session has expired.

Whole-invocation cleanup still requires every selected workflow to pass and exact owned-resource absence to be verified. Production does not start a ticket checkout or switch live checkout settings to TEST mode. Historical provider cleanup requires TEST-only proof credentials; if registered Billing credential discovery is unavailable, the documented explicit `E2E_STRIPE_TEST_SECRET_KEY`, `E2E_STRIPE_TEST_ACCOUNT_ID`, and `E2E_BILLING_ORGANIZATION_ID` overrides may be set in the private E2E environment file. The organization must match the selected target; never use a LIVE key.
