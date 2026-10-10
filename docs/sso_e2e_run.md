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
