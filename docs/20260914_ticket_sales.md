# Goal
Make Eventoren ticket sales work end-to-end with Convex, Billing payments, ticket administration, and a server-rendered homepage cached for 60 seconds.

# Decisions
- Eventoren owns events, ticket products, inventory, reservations, and issued tickets.
- Eventoren pushes catalog changes to Billing. Billing uses these persisted products for Eventoren checkout, not Contentoren catalog fetching.
- Billing owns payment truth. Issue tickets only after server-confirmed payment.
- Reuse existing authentication, libraries, UI components, and visual design.
- Preserve existing unrelated work. Verify before committing and deploying.

# Approach
Build the authoritative Convex catalog first, add a Billing catalog contract using existing payment machinery, connect reservations and payment reconciliation, then connect public/admin UI. Verify backend and browser flows before using a fresh Luna agent for the commits skill and deployment.

# Tasks
1. Completed: implement and test Convex catalog, admin authorization, inventory foundation, and public queries. Catalog uses monotonic versions and pending sync records.
2. Completed: implement and test authenticated Billing catalog ingestion and catalog-backed checkout/status API; contract documented in Billing docs/offer-confirmation-api.md. Billing does not reserve inventory.
3. Completed: catalog push, reservations, checkout, reconciliation, issuance, and authenticated Billing session expiration with safe abandoned-reservation release.
4. Completed: connect homepage/event pages to Convex with 60-second SSR caching; implement admin management and persistent checkout/tickets UI. Backend interfaces are documented in docs/ticket_checkout_backend.md.
5. Completed: verify and fix backend deployment/configuration and end-to-end browser purchase/admin flows.
6. Completed: commit and push using Luna commits skill, deploy production services, and verify deployed services. Production auth, admin access, catalog synchronization, and live merchant configuration are configured; production catalog remains unpublished.
