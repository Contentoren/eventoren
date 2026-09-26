# Visual refresh: orders and organizer ticket scanner

## Goal
Modernize `/admin/bestellungen` and `/organizer/event/:eventId`, especially the ticket scanner at phone widths, without changing functionality. Reference event: `qa-draft-1789387272`.

## Non-negotiable boundaries
- Preserve every existing text, icon, field, action, link, state binding, condition, event handler, accessibility semantic, and navigation/check-in/scanner behavior.
- Do not add, remove, hide, or disable controls. No data mutations, production deployment, dependency changes, or unrelated refactoring.
- Reuse existing `#ui/...` components and installed dependencies. Follow the code-style skill for TSX changes.
- Preserve all pre-existing working-tree changes, including changes within the organizer page. Compare against the file contents at task start, not just Git HEAD.
- Limit implementation to the two page components below. Do not edit routes, state modules, scanner implementation, texts, shared shells, global theme tokens, or shared UI primitives.
- Maintain existing light/dark theme compatibility and meaningful status colors.

## Design decisions
- Retain existing mint as the selection/accent color, dark readable text, and the light neutral visual direction.
- Use soft surface contrast, understated borders/shadows, consistent rounded corners, and deliberate spacing rather than strongly outlined nested boxes.
- Establish hierarchy through typography, spacing, and surfaces without changing wording, icons, or information order.
- Orders: cohesive filter toolbar, full-width mobile search field with remaining controls wrapping below, scannable order rows/tiles, and clearly nested expanded details.
- Scanner: more balanced responsive preview size, compact but comfortably spaced panel, visually distinct existing feedback and manual-entry areas, and approximately 44–48 px primary mobile control heights. Do not change video mounting, camera dimensions requested by scanner code, or state-dependent rendering.
- Keep the existing responsive layouts, fixed mobile navigation, safe-area clearance, content accessibility, and visibility of all controls functional. Verify at 390 px mobile and approximately 1440 px desktop.

## Tasks and ownership
1. **Admin orders styling** — `src/admin/AdminTicketOrdersPage.tsx` only. Update page-local visual classes and presentation layout. Preserve component props/handlers/content and existing list/tile/expanded states. Status: completed.
2. **Organizer event/scanner styling** — `src/organizer/OrganizerEventDetailPage.tsx` only. Refine page-local responsive styling for scanner, list, details and empty states. Preserve all existing organizer edits and scanner behavior. Status: completed.
3. **Static regression review** — independently review the changes against task-start snapshots for unchanged content, icons, fields, handlers, conditions, and non-presentational props. Run only the focused tests listed below and typecheck. Make no unrelated fixes. Status: completed.
4. **Browser visual verification** — inspect the modified local app on desktop and mobile, orders list and expanded detail, organizer/scanner closed and open, existing feedback/manual entry, and dark mode if available. Do not check in/reset tickets or submit mutating actions. Use browser agent; no full e2e suite. Status: completed.

## Verification approach
- Each implementer records a task-start snapshot outside the repository for precise review of their own changes and reports its path.
- Focused tests: `bun test test/adminTicketOrdersPageStateCreate.test.ts test/adminTicketOrderSearchMatches.test.ts test/adminTicketOrderDetailsPanelStateCreate.test.ts test/organizerTicketScanner.test.ts`.
- Typecheck: `bun run typecheck` (run once after both implementation tasks).
- Browser verification must use the modified checkout, not mistake the unchanged deployed app for the new design. Authenticate using existing configured test credentials; never report credentials.
- Camera unavailable is an environment limitation, not permission to alter behavior. Review the existing fallback state without scanning or mutating data.

## Current context
- User approved the design direction and explicitly reaffirmed functionality must not change.
- Initial live review confirmed both routes on desktop and mobile; the scanner showed its existing no-camera fallback in the audit browser.
- The working tree contains extensive existing changes. Page-local work is deliberately isolated from shared shells and behavior.
- Both page-local styling tasks and the proportional desktop order-grid refinement are complete, including independent static and responsive browser review. Implementation remains limited to presentation in the two designated components.
- Task-start snapshots: `/tmp/AdminTicketOrdersPage.task-start.20260926.tsx` and `/tmp/OrganizerEventDetailPage.task-start.20260926.tsx`.
- The existing `eventoren.service` serves this modified checkout through `https://eventoren.leonardomora.de` (registered preview proxy port 3057). Use this configured preview host and its existing auth callback for browser review; no additional server or deployment is needed.
