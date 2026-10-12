# Allow Publishing and Saving Events Without Ticket Products

## Goal
Allow events to be saved as published ("Änderungen speichern") and published ("Veröffentlichen") even when they have no ticket products (ticket tiers). In this state, hide the event from the public catalog list until at least one ticket tier is active, show a warning badge in the Admin events list, and show a red exclamation mark on the "Ticketprodukte" tab when an event has 0 ticket products.

## Decisions
1. **Backend Mutations**:
   - Removed the check requiring at least one ticket tier in `catalogEventPublishMutation` and `catalogEventUpsertMutation`. Publishing and upserting as published are allowed without ticket tiers.
2. **Public Catalog Filtering**:
   - In `catalogEventListPublishedPageQuery` and `catalogEventListPublishedQuery`, filter out published events that have 0 active ticket tiers (`tiers.length === 0`) so they do not show in the public store/catalog without purchasable tickets.
3. **Admin State & Details Form**:
   - In `adminCatalogPageStateCreate.ts`, removed the automatic downgrade of status from `"published"` to `"draft"` when `tiers.length === 0`.
   - In `adminEventDetailsFormStateCreate.ts`, updated `canPublish` so saving/publishing is enabled as long as the event key exists.
   - In `AdminEventDetailsForm.tsx`, removed the blocking note and added an informative warning note when an event is published with 0 ticket products: it is published, but will only be visible in the public catalog once a ticket product is active.
4. **Admin Event Tabs (`AdminEventTabs.tsx`)**:
   - Added a red exclamation mark badge (`!`) next to the "Ticketprodukte" tab when the event has 0 ticket products (`tierCount === 0`).
   - Passed `tierCount` into `AdminEventTabs` from `AdminEventDetailPage` (from `event().tiers.length`) and `AdminEventNewPage` (from `selectedEvent()?.tiers.length ?? 0`).
5. **Admin Events List (`AdminEventsListPage.tsx`)**:
   - In both list and tile views, displayed a warning badge (`Badge` variant `filledYellow` with "Keine Ticketprodukte") alongside the status badge when `event.tiers.length === 0`.

## Tasks Status
- [x] **Task 1: Backend Mutations & Public Catalog Queries**
  - Updated `catalogEventPublishMutation.ts` and `catalogEventUpsertMutation.ts` to allow `status: "published"` with 0 ticket tiers.
  - Updated `catalogEventListPublishedPageQuery.ts` and `catalogEventListPublishedQuery.ts` to filter out published events with 0 active tiers.
- [x] **Task 2: Admin State, Form, and Tabs**
  - Updated `adminCatalogPageStateCreate.ts` (preserve published status) and `adminEventDetailsFormStateCreate.ts` (`canPublish` logic).
  - Updated `AdminEventDetailsForm.tsx` (enable button and show warning note if 0 tiers).
  - Updated `AdminEventTabs.tsx`, `AdminEventDetailPage.tsx`, and `AdminEventNewPage.tsx` to display a red exclamation mark `!` on the "Ticketprodukte" tab when `tierCount === 0`.
- [x] **Task 3: Admin Events List Page Warning Badge**
  - In `AdminEventsListPage.tsx`, added a warning badge (`Badge` variant `filledYellow` with "Keine Ticketprodukte") whenever `event.tiers.length === 0`.
- [x] **Task 4: Verification & Tests**
  - Updated unit tests in `test/adminCatalogPageStateCreate.test.ts`.
  - Added test coverage in `convex-tests/catalog.test.ts` for publishing without tiers and verifying public list filtering.
  - Updated `convex-tests/catalogEventListAdminPage.test.ts`.
  - All targeted tests passed.
