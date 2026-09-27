# Borderless design for the administration area

## Goal and approved reference
Extend the approved elegant, borderless appearance of orders and the organizer ticket scanner to the remaining pages in the administration area shown by the user. Reference: `docs/20260926_admin-scanner-design.md` and the current `AdminTicketOrdersPage.tsx` / `OrganizerEventDetailPage.tsx` surfaces.

## Scope
- Sidebar and its account/theme/list-view/logout controls in the shared admin/organizer shell.
- Bestellungen: `/admin/bestellungen`, preserving the already approved appearance.
- Ticket-Scanner: `/organizer` and `/organizer/event/:eventId`, including their in-area mobile navigation; preserve the approved detail/scanner appearance.
- Scanner-Freigabelinks: `/admin/scanner-links` and management UI rendered inside that page.
- Events: `/admin/events`, `/admin/events/new`, `/admin/events/:eventKey`, including all existing editor tabs, forms, ticket products, feedback and nested fields.
- Veranstalter: `/admin/veranstalter` and its existing expanded/dialog states.
- Mitglieder: `/admin/mitglieder` and its existing expanded/dialog states.

## Explicit exclusions
- Public website, public events, booking/checkout, auth and unrelated account pages.
- Standalone scanner-share/token destinations, including `ScannerLinkEventListRoute`, `ScannerLinkEventDetailRoute`, and their exclusive `ScannerHelperManagement` UI.
- Demo-only `AdminCatalogPage`, global theme styles and shared `#ui` primitive defaults.
- No backend, state, route behavior, new features, dependencies, asset changes, deployment, commits or data mutations.

## Non-negotiable preservation
- Keep all text, icons, fields, links, actions, handlers, conditions, state/data expressions, accessibility semantics, and component behavior unchanged.
- Preserve every existing control and its visibility, keyboard-focus indication, status meaning, responsive layouts, safe areas, and scanner lifecycle.
- Use existing `#ui/...` components and installed libraries. Load the code-style skill before TS/TSX edits.
- Preserve unrelated working-tree changes. Record exact task-start snapshots for each owned file outside the repository; review against those snapshots, not just HEAD.
- Existing components reused outside the scoped shell must receive scope-gated visual changes, not unconditional public-facing changes.

## Design approach
- Replace ordinary enclosing frames and strong separators with gentle tonal surfaces, spacing and restrained diffuse shadows, matching the approved two pages.
- Major cards may be softly elevated; nested groups and fields use muted fills rather than stacking shadows on every element.
- Preserve the existing mint accent, typography/content hierarchy, semantic status text/background colors and dark-mode readability.
- Inputs, filters and outlined controls should appear borderless but remain clearly recognizable and retain their keyboard-focus indication. Do not substitute permanent rings or inset outlines for frames.
- Mobile must retain the same surface, shadow, corner and control styling as desktop; only responsive arrangement/size may differ. Check mobile drawer, expanded sections, dropdown/popover contents and all event form tabs for inconsistent fallback frames or styles.
- Prefer explicit local class/style changes. Do not use blanket descendant border/shadow resets or change global shared primitives.
- The shell adds a styling-only `admin-workspace` ancestor class. When a modified view is reused outside this area, gate its new classes with the ancestor (for example `[.admin-workspace_&]:border-0`) or an equally narrow presentation-only mechanism. No behavior props or route conditions are needed for styling.
- Preserve the approved order/scanner appearance except the user-requested mobile refinement below: the empty ticket-detail hint must be compact on phones, and the lower organizer navigation must use the same borderless tonal/shadow treatment. Keep existing hint text, nav items/icons/actions, fixed positioning, safe-area handling and desktop detail layout.
- An already-checked-in ticket must show its existing disabled “Einchecken” button in neutral gray, never green/mint. Style the existing disabled/state presentation only; do not change check-in eligibility, disabled conditions, labels, icons or handlers. Apply consistently to mobile-inline and desktop detail actions inside this area.

## Tasks and ownership
1. **Shell foundation** — `src/admin/AdminShell.tsx`; its `AdminListViewControl` view if present and needed; `src/organizer/OrganizerEventDetailMobileNav.tsx` only if necessary for in-area navigation. Add the scope marker and remove shell/control frames through existing style props/classes. No shared `#ui` edits. Status: completed.
2. **Events page surfaces** — `src/admin/AdminEventsListPage.tsx`, `AdminEventNewPage.tsx`, `AdminEventDetailPage.tsx`, `AdminEventDetailHeader.tsx`, `AdminEventTabs.tsx`, `AdminEventFeedback.tsx`. Style only these owned views; preserve tab selection and editor behavior. Status: completed.
3. **Event editor forms** — `src/admin/AdminEventDetailsForm.tsx`, `AdminEventHighlightsFields.tsx`, `AdminTicketProductsForm.tsx`. Include all existing field/group/product states without altering values, controls, bindings or validation. Status: completed.
4. **Management pages** — `src/admin/AdminScannerLinksPage.tsx`, `AdminOrganizerMembersPage.tsx`, `AdminMemberManagement.tsx`. Style list/card/form/expanded/dialog surfaces through existing style props; retain statuses and all management actions. Status: completed.
5. **Organizer event overview** — `src/organizer/OrganizerEventListPage.tsx`. Confirm consumers and scope-gate changes wherever this view is shared outside the administration shell. Preserve approved event-detail scanner and standalone share destinations. Status: completed.
6. **Independent regression and scope review** — compare every edited file with task-start snapshots for presentation-only changes; confirm exclusions/global primitives unchanged. Run typecheck once and the focused tests below. Status: completed.
7. **Browser review** — verify every sidebar destination and existing event editor tabs; representative expanded states, desktop and mobile; keyboard focus and a temporary unsaved dark preview. Confirm approved orders/scanner appearance and public/standalone pages not visually affected by shared changes. No mutating actions. Status: completed for accessible views.
8. **Mobile parity refinements** — `src/admin/AdminShell.tsx` (align drawer/desktop surface only), `src/admin/AdminScannerLinksPage.tsx` (empty picker child via existing `noItemsClass`), `src/organizer/OrganizerEventDetailPage.tsx` (compact mobile empty detail and neutral gray existing disabled check-in actions, scope-gated), and `src/organizer/OrganizerEventDetailMobileNav.tsx` (borderless bottom navigation and subtle shadow). Preserve all behavior/content and scope boundaries. Status: completed.

## Sequence and verification
- Complete shell foundation first. Then delegate independent page/form groups with exclusive ownership; keep each increment small.
- Each implementer performs only formatting, scoped diff checking and comparison against its snapshot. Do not run broad tests or e2e per styling increment.
- Run `bun run typecheck` once after implementation.
- Focused tests: `bun test test/adminShellNavigationResolve.test.ts test/adminEventFormAdapters.test.ts test/adminEventHighlights.test.ts test/adminMemberManagementText.test.ts test/adminMemberManagementInvitationFormat.test.ts test/adminZitadelOrganizerMembersList.test.ts test/adminScannerLinksStateCreate.test.ts test/organizerEventListPageStateCreate.test.ts test/organizerEventDetailPageStateCreate.test.ts test/organizerTicketScanner.test.ts`.
- Browser work belongs to a browser agent. Use the existing configured preview and CLI test credentials without disclosing secrets. Expand/read only: do not save events, invite/manage members, issue/revoke links, purchase or check in/reset tickets.
- Prefer 1440 px desktop and 390 px mobile; include 1280 px for dense lists and narrower navigation if needed.

## Current context
- The user narrowed the request to the shown management area and its subpages, not the whole website.
- Discovery is complete. AdminCatalogPage is demo-only; ScannerHelperManagement belongs to standalone share destinations and is excluded.
- The checkout was clean during discovery. Existing approved orders/scanner styling is the visual reference.
- The configured preview host is `https://eventoren.leonardomora.de`; verify the existing service still serves this checkout before browser review.
- Shell, pages, forms and the requested mobile refinements are complete, including independent regression review and browser review of accessible views. `admin-workspace` marks the shell root and mobile drawer portal; reused views use this scope for the new appearance. Changes remain presentation-only and restricted to the requested management area.
- Shell task-start snapshot: `/tmp/AdminShell.admin-area-start.20260927-1246.tsx`.
- Page/form snapshots use `/tmp/<Component>.admin-area-start.20260927-task2.tsx`, `-task3.tsx`, or `-task4.tsx` matching task ownership; organizer overview snapshot is `/tmp/OrganizerEventListPage.admin-area-start.20260927-1327.tsx`.
- Final refinement snapshots: `/tmp/OrganizerEventDetailPage.admin-mobile-refinement-start.20260927.tsx`, `/tmp/OrganizerEventDetailMobileNav.admin-mobile-refinement-start.20260927.tsx`, and `/tmp/admin-mobile-parity-start-20260927/{AdminShell,AdminScannerLinksPage}.tsx`.
