# SSO E2E run

The production command runs an SSO-only smoke test against `https://eventoren.de`; it does not run ticket lifecycle steps or start a Stripe checkout:

```bash
bun run test:e2e
```

For the combined SSO and ticket-purchase workflow against development/preview, run:

```bash
bun run test:e2e:dev
```

Production ticket E2E remains explicitly guarded because production checkout uses live Stripe; the guard refuses to create an event or enter payment details until test-mode checkout and owned-resource cleanup are verified. For standalone SSO diagnostics, use `E2E_TARGET=development bunx rstest run --config e2e/rstest.config.ts` (this bypasses the combined runner). Credentials are resolved from the local `contentoren` Zitadel profile, or from a paired `E2E_AUTH_USERNAME` and `E2E_AUTH_PASSWORD` override. Put local values in ignored `.env.e2e.local` (or select a file with `E2E_ENV_FILE`); never commit credentials. The isolated SSO workflow only signs in and verifies the authenticated `Veranstalter` and `Verwaltung` links; it does not mutate business data.
