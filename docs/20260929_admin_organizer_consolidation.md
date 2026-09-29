# Admin organizer consolidation

## Goal
Make `/admin/mitglieder` a complete replacement for the live `/admin/veranstalter` organizer directory, then remove the latter page and sidebar entry. Keep existing links functional by redirecting the old URL to the organizer-filtered member view.

## Decisions
- Preserve the complete active-organizer list, not merely the first 50 returned members. The current organizer page paginates through all members; the members view must cover this case without regressing member search or role management.
- Preserve organizer invitation dates in the member view using the existing `organizerInvitedAt` value and formatter; no new backend field is needed.
- The old live route redirects to `/admin/mitglieder?memberRole=organizer`. Do not remove the separate demo organizer route or demo components/tests.
- Reuse existing `#ui/...` components and package dependencies; make minimal changes. Do not hand-edit generated route trees.

## Tasks
1. [done] Ensure the live members view loads the complete matching member set (including all active organizers) and displays invitation dates where applicable; add focused tests for pagination/filter/date behavior.
2. [done] Remove the organizer sidebar entry and replace the live organizer route with a redirect to the organizer-filtered members page; update focused navigation/route tests and delete live-only dead code only if clearly unreferenced.
3. [done] Run focused tests/typecheck and browser-check the affected admin navigation, redirect, organizer filter, and invitation dates. Avoid full e2e runs until the final verification step.

## Current context
The members server function paginates through all matching members and displays existing organizer invitation dates. The old route redirects to the organizer-filtered member view; its sidebar entry and live-only server wrapper are removed. Focused tests and typecheck pass. Browser verification confirmed the redirect and sidebar; member rows and invitation dates could not be inspected because the authenticated preview currently shows the shared admin error view on both member and order pages.
