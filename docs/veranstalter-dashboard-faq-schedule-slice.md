# Organizer dashboard FAQ + schedule slice

Implemented directly in `feature-veranstalter-dashboard`; no git writes, codegen, deployment, server start, or delegation.

## Canonical write/detail contract

Both `organizerDashboardEventCreateSchema` and `organizerDashboardEventPatchSchema` accept:

- `faqs?: CatalogEventFaqs`: at most **20** `{ id, question, answer }` entries.
  - `id`: 1–64 ASCII letters/digits/`_`/`-`, unique within the list.
  - `question`: trimmed, nonblank, max 200 characters.
  - `answer`: trimmed, nonblank, max 1000 characters.
- `schedule?: CatalogEventSchedule`: at most **50** `{ id, time, title, detail? }` entries.
  - `id`: same restrictions as FAQ IDs, unique within this list.
  - `time`: exact `HH:mm`, `00:00`–`23:59`, **Europe/Berlin wall time**, not an ISO instant.
  - `title`: trimmed, nonblank, max 200 characters.
  - `detail`: optional string, max 1000 characters; empty is allowed.

Runtime schemas and derived types live in `src/catalog/catalogEvent{FaqItem,Faqs,ScheduleItem,Schedule}Schema.ts`. Convex table and mutation shape validators derive from these schemas; create/patch parsers perform the value/count/uniqueness validation before storage. Existing parsers retain these fields automatically, so no separate parser mapping was necessary.

List order is canonical display order (not sorted by time, which would break midnight programs). IDs are generated once by the editor and retained on edits. In patches, omission preserves the stored field; `[]` explicitly clears it. Null is not accepted. Legacy absent values are not backfilled.

The existing permission/org/draft guards remain unchanged. No pricing, lifecycle, team, or order behavior was changed.

## UI/public reads

The live detail query projection includes canonical fields. The detail state factory owns add/edit/delete/clear/reload/save behavior and leaves mutation bindings at setup time through the existing mutation factory. Live query refreshes do not discard dirty rows; explicit reload discards those row drafts and reads the latest canonical subscription value. Route scope changes discard drafts. Controls reuse `#ui`, and the TSX remains presentation-only. Read-only and non-draft details show saved rows without edit controls.

Public `EventItem.faqs` carries the stored FAQ entries. Public `EventItem.schedule` uses the existing presentation shape `{ id, marker, title, detail? }`, with `marker = "HH:mm Uhr (Europe/Berlin)"`. The catalog full and summary queries share this projection. `EventDetailPageView` uses explicit props first, then these live catalog fields. Absent fields still invoke the existing legacy fallback; explicit empty arrays suppress it. No demo store was imported.

## Parent-owned forwarding still required

These files were deliberately **not edited** because the parent owns API/client/CLI/export work:

1. `src/organizer/dashboard/api/organizerDashboardRequestParse.ts`: add `faqs` and `schedule` using the create/patch schema entries in the strict `event-create` / `event-update` request schemas.
2. `src/organizer/dashboard/api/organizerDashboardConvexBackendCreate.ts`: extend `eventCreate` / `eventUpdate` argument types with the derived types (or derive the complete inputs from the model schemas); forward both optional fields into the Convex mutation calls, including `[]` (check `!== undefined`, not length).
3. `src/client/organizerDashboardClientCreate.ts`: add the same two schema entries to its event create/update validation wrappers. Function-reference-derived argument/detail types already inherit the backend additions. Export shared item/list schemas/types via the parent-owned public library entry as appropriate.
4. CLI shares the API request parser/backend, so fixing those enables its existing JSON event commands. Add parity tests for Hono/client/CLI create, update, omission and clearing.
5. Hono and CLI currently cap request JSON at **32768 bytes**. Valid maximum-sized lists can exceed this even in ASCII. Parent should raise the bounded transport cap (e.g. 512 KiB) or explicitly document a lower transport limit; avoid claiming all schema-valid payloads work through every surface until resolved.
6. If an MCP surface forwards these event operations, preserve these fields there as well. No MCP files were changed in this slice.

## Validation evidence

Run in a clean shell environment with `env -i HOME="$HOME" PATH="$PATH" ...`:

- `bun test src/catalog/catalogEventContentSchema.test.ts src/events/eventDetailInfoCatalogContent.test.ts src/organizer/dashboard/pages/events/veranstalterDashboardEventDetailState.test.ts src/organizer/dashboard/pages/events/veranstalterDashboardEventMutationsCreate.test.ts src/organizer/dashboard/pages/events/veranstalterDashboardEventFormValidate.test.ts`: **25 passed**.
- `bunx --no-install vitest run --config vitest.convex.config.ts convex-tests/organizerDashboardEvents.test.ts convex-tests/organizerDashboardAuthorizationEdge.test.ts convex-tests/organizerDashboardLegacyIsolation.test.ts`: **25 passed**, no codegen.
- Focused coverage includes item/count/length/unique-ID limits, strict HH:mm and midnight/DST wall times, parser preservation, editor IDs/live refresh/reload/route scope, optional-field clearing, foreign-org/read-only write denial, full/summary public projection, and unchanged legacy fallback semantics.
- Scoped Biome formatting completed. `git diff --check` passed.
- `tsc --noEmit --pretty false` was attempted. Full check is blocked by errors outside the slice (missing API-key credential modules/table/generated entries, demo admin order-state mismatch, dashboard API mock missing team methods). No diagnostics named files changed in this slice. Full diagnostic output was captured at `/tmp/eventoren-faq-schedule-tsc.txt`.

No live browser/e2e verification was performed (server start and delegation were prohibited). No all-dashboard completion claim is made; cross-surface forwarding above remains parent work.
