# Ticket purchase E2E run

Run the Rstest + Playwright workflows against the existing preview environment:

```bash
bun run test:e2e:dev
```

`test:e2e:dev` runs SSO and then ticket purchase against `https://eventoren.leonardomora.de`. `test:e2e` defaults to `https://eventoren.de` and currently **fails before either workflow starts**: production checkout is configured for live Stripe and the test must not create an event or charge a real card there. `test:e2e:ticket` is temporarily an alias for the guarded preview runner (including SSO), not a cleanup bypass. An explicit `E2E_BASE_URL` must match the selected target's canonical origin; the runner never points a production invocation at preview. The workflow also refuses to enter a card unless Stripe's hosted checkout URL contains a `cs_test_` session identifier.

**Rollout incomplete:** a private Valibot-validated target-bound checkpoint stores the run marker and resumes SSO after failure. It marks ticket effects uncertain *before* starting that browser suite, then refuses to retry or clear the checkpoint without reconciliation. The existing lifecycle still does not checkpoint individual steps or clean the event/order, Stripe test records, delivered email and PDF. The runner therefore exits nonzero even if both browser suites pass; resolve the owned resources before restarting. Stale ticket checkpoints are retained, not age-deleted. Production must remain blocked until test-only routing and exact-ownership cleanup are available end to end.

## Prerequisites

- Preview frontend, Convex functions, Stripe test credentials/webhooks, and ticket fulfillment/email delivery are operational. The test creates and publishes an event through the admin UI and makes a real sandbox charge.
- The Zitadel `contentoren` profile can resolve `testadmin` locally. Alternatively, provide both `E2E_AUTH_USERNAME` and `E2E_AUTH_PASSWORD`. The account must be able to create/publish events and have the organizer role. Organizer access alone may not grant application-admin access; if `/admin/events` redirects to `/sso`, provision the app-admin permission before running. A one-sided explicit credential configuration is rejected.
- Configure the existing Billing E2E mailbox. The IMAP user must also be a deliverable checkout recipient:

  ```dotenv
  TEST_CUSTOMER_MAILCOW_HOST=imap.example.test
  TEST_CUSTOMER_MAILCOW_IMAP_PORT=993
  TEST_CUSTOMER_MAILCOW_USER=ticket-e2e@example.test
  TEST_CUSTOMER_MAILCOW_PASS=...
  ```

  These values can be placed in ignored `.env.e2e.local` (or a file selected using `E2E_ENV_FILE`). Do not commit credentials. IMAP must offer TLS on the configured port.
- Install Playwright Chromium for the installed package (`bunx playwright install chromium`). Install Poppler `pdftotext` and `pdftoppm`; the PDF helper rasterizes every delivered ticket and decodes its QR from the rendered image.
- Use Node 22+ and Bun 1.4+ as declared in `package.json`.

The test uses bounded waits for Stripe return/paid state and matching IMAP delivery; it does not use the development payment bypass, mock payment, synthetic email, or synthetic PDF. A fresh unauthenticated browser context opens the emailed capability link. The decoded QR payload is submitted in the organizer's manual ticket-code control, then submitted again to verify duplicate rejection and persisted check-in state. The organizer detail page includes this manual-entry control alongside camera scanning so a printed code can also be checked without camera access.

Run offline Node-worker helper checks with `bun run test:e2e:helpers` and type-check the E2E files with `bunx tsc --noEmit --project e2e/tsconfig.json`; neither requires credentials or a browser. Helper tests are excluded from the default `bun run test` and browser workflow configs. Admin-access and the full lifecycle are independent tests, and the paid order's stages still live in one lifecycle test; splitting them into resumable, separately checkpointed step files is outstanding.
