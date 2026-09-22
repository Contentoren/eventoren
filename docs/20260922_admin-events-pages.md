# Admin event pages

## Goal
Replace the combined event/list/product editor with a clean event list, creation page, and individual event pages containing Details and Ticket products tabs. Preserve existing save, publish, authorization, and inventory behavior.

## Decisions
- Reuse existing `#ui/...` components and installed libraries. All implementation is delegated to sol-medium.
- `/admin/events` lists events with title, readable date, location, status, search/status filtering, and New event action; omit raw IDs from primary presentation.
- `/admin/events/new` shows grouped details; ticket products become available after creation.
- `/admin/events/$eventKey` shows event title, status, Back to events, and Details/Ticket products tabs (URL search state or nested routes using existing conventions).
- Details groups: Basics, Date & location, Appearance, Publishing; technical keys and ordering belong in Advanced. Use date/time controls with correct ISO conversion.
- Ticket products show compact product summaries with price and capacity and a selected-product editor. Edit euros; serialize integer cents without changing inventory rules.
- Keep German UI language, responsive layout, theme tokens, clear action hierarchy and feedback. Avoid duplicate large page titles and explanatory technical prose.
- Admin data must include drafts/archived records through authorized queries; public catalog filtering remains unchanged. Saved drafts must survive refresh and direct links.
- Preserve unrelated working-tree changes. No unrelated redesign, new dependencies, delete workflow, or backend domain refactor.

## Approach and tasks
1. Implement and test authorized admin event loading, including all statuses and ticket data needed by existing editors; integrate existing admin loader without changing public catalog semantics.
2. Implement page separation and redesigned list/details/product UI, route-aware selection and creation navigation, grouped controls, date/euro adapters, and targeted tests. Generate router output through existing tooling.
3. Independently verify routes, permissions, save/reload, tab navigation, ticket editing, responsive/theme appearance in browser; fix scoped defects and run relevant checks.

## Current status
- Tasks 1–3 complete, including authenticated creation, detail save, ticket-price persistence, and direct-link/full-refresh browser verification.
- Event selection uses a reactive accessor so server-rendered detail and ticket content matches client hydration.
- Save and publish handlers contain unexpected failures, show contextual feedback, and reset pending state after reload completes.
- Details are grouped with local date/time controls; ticket inputs use euros with integer-cent conversion. Technical fields use Advanced sections.
- Routes use non-nested `admin.events_.*` filenames; filters and selected tab use search parameters.
- Admin loader now uses an authorized paginated all-status query; public catalog remains published-only.
- Working tree contains extensive existing changes; avoid overwriting or reverting them.
