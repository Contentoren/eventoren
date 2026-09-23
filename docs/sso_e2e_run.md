# SSO E2E run

Run the isolated SSO login workflow against the existing preview environment:

```bash
E2E_BASE_URL=https://eventoren.leonardomora.de bun run test:e2e
```

Credentials are resolved from the local `contentoren` Zitadel profile, or from a paired `E2E_AUTH_USERNAME` and `E2E_AUTH_PASSWORD` override. Put local values in ignored `.env.e2e.local` (or select a file with `E2E_ENV_FILE`); never commit credentials. The workflow only signs in and verifies the authenticated `Veranstalter` and `Verwaltung` links; it does not mutate business data.
