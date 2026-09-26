# SSO E2E run

The guarded preview runner executes SSO, then ticket purchase:

```bash
bun run test:e2e:dev
```

`test:e2e` selects production, but currently fails closed before SSO because the mandatory ticket suite would encounter live Stripe. For SSO-only diagnostics, use `E2E_TARGET=development bunx rstest run --config e2e/rstest.config.ts` (this bypasses the combined runner). Credentials are resolved from the local `contentoren` Zitadel profile, or from a paired `E2E_AUTH_USERNAME` and `E2E_AUTH_PASSWORD` override. Put local values in ignored `.env.e2e.local` (or select a file with `E2E_ENV_FILE`); never commit credentials. The isolated SSO workflow only signs in and verifies the authenticated `Veranstalter` and `Verwaltung` links; it does not mutate business data.
