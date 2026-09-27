# Mobile ticket-scanner views

## Goal
On organizer event ticket-scanner pages, make the mobile Profile, Scanner, and Tickets destinations distinct, focused views. Preserve desktop behavior and the existing ticket/check-in services.

## Decisions and scope
- Apply below the existing `md` breakpoint and only where `OrganizerEventDetailPage` enables `mobileNavigation`.
- Keep the Profile / Scanner / Tickets bottom navigation visible in all three views, including Profile and opened ticket details. It is not global navigation for other admin/organizer pages.
- Tickets is the initial view. Show the existing search and ticket list with current names, metadata, status, and pagination. Remove the mobile event heading, back-to-event heading, camera shortcut, and empty detail placeholder.
- Tapping a ticket expands it inline immediately below its list row, without replacing the list. The green check-in button is the first expanded content; further information is separately collapsible and initially closed. Preserve existing check-in eligibility, search, selected-ticket URL state, and search across tabs. Do not repeat the row's customer name or ticket number in the inline expansion on either mobile or desktop.
- Profile shows the actual shared sidebar content inline: Eventoren brand, authorized navigation with icons and labels, account and existing account controls. Do not open a drawer or duplicate auth/navigation/theme/logout business logic. Normal profile-menu navigation leaves this ticket-scanner area and its bottom tabs.
- Scanner immediately requests/starts the existing rear-camera scanner. Its video fills the viewport above the bottom navigation. No mobile manual ticket-code form, start/stop control, extra scan icon, event title, or decorative framing.
- A recognized code uses the existing automatic check-in operation. Only a confirmed successful check-in shows `Ticket erfolgreich eingecheckt`. Keep meaningful existing already-checked-in/invalid/error outcomes, never claim success before the operation completes.
- Show scan outcomes as brief text overlays (approximately three seconds), without stopping the camera. Camera permission/device errors remain readable when no camera image is available; re-entering Scanner can retry. Browser camera permission remains unavoidable.
- Stop camera tracks when leaving Scanner or unmounting. Preserve repeated-frame/in-flight scan protection. Do not add vibration or dependencies for this change.
- Keep desktop layout, manual entry, scanner controls, and feedback behavior unchanged, except removing duplicate customer name/ticket number from the expanded list row. Reuse `#ui/...` components and existing package dependencies.

## Current context
- Main files: `src/organizer/OrganizerEventDetailPage.tsx`, its state creator, `OrganizerEventDetailMobileNav.tsx`, its state creator, and `organizerTicketScannerStateCreate.ts`.
- Organizer event route: `src/routes/organizer_.event.$eventId.tsx`; it uses `OrganizerShell` / `AdminShell`.
- `AdminSidebarContent.tsx` now contains shared sidebar content. `adminSidebarContext` exposes `open()` and `renderContent()`; the renderer reuses the existing shell state and list-view visibility.
- Mobile destinations are now URL-backed through `view` with separate view/profile state creators; search and selected-ticket context survive tab switches. Profile renders under the shell provider, and Scanner uses one video-rendering path.
- The mobile camera-only presentation, view-driven camera lifecycle, late-start cleanup, and transient mobile check-in feedback are implemented. Mobile camera error guidance does not reference the removed manual form. The camera reserves the same 72px plus safe-area inset as the bottom navigation.
- Ticket selection must keep the mobile list on screen and expand the selected row inline, with check-in first and optional information collapsed beneath it.
- The working tree already contains unrelated borderless admin/organizer styling edits, including the shell, mobile nav, and event detail page, plus `docs/20260927_admin-area-borderless.md`. Preserve them; do not reset, commit, or redesign unrelated files.
- Live preview is `https://eventoren.leonardomora.de`. Organizer access was verified with configured `contentoren` testadmin; the ordinary testuser redirects to the homepage. Never expose credentials.

## Implementation tasks
1. **Shared inline profile content — completed.** Extract/reuse the existing sidebar content and provide the smallest bridge that lets an organizer event page render it inline using the same shell state. Preserve desktop sidebar, ordinary mobile drawers, authorization, account controls, and existing styling. Do not yet change ticket/scanner presentation.
2. **Mobile destinations and ticket details — completed.** Keep explicit mobile destinations and the persistent scoped footer. Change ticket selection to inline expansion with green check-in first and a separately collapsible information section; remove duplicate identity text from expanded rows on desktop as well. Preserve URL-backed search/selection and the scanner presentation/lifecycle path.
3. **Full camera scanner and transient feedback — completed.** Complete edge-to-edge mobile camera layout above the footer, entry auto-start/exit cleanup, removal of mobile-only manual controls, and transient check-in overlays with exact success text. Preserve desktop controls and existing check-in API, duplicate protection, and errors.
4. **Focused verification — completed.** Run only affected state/contract tests and relevant targeted new tests, then use a browser agent for mobile and desktop checks on the running app. Correct issues in small delegated increments.

## Verification acceptance
- Mobile Tickets keeps search/list visible when a ticket is tapped; its green check-in action expands immediately below that row, optional information is initially collapsed, and the footer remains accessible. Expanded rows do not repeat customer name/ticket number on mobile or desktop.
- Switching tabs retains event/search context, highlights the selected view, and never opens Profile as a drawer.
- Profile contains the same authorized brand/navigation/account content and a visible usable bottom footer; navigation elsewhere does not retain the event footer.
- Scanner video occupies the area above the safe-area-aware footer; no manual code input or scanner buttons are visible on mobile.
- Confirmed scans auto-check-in and briefly show the specified text; repeated/invalid/error results are handled without breaking subsequent scanning. Do not modify live ticket data for verification; use targeted mocks or a browser-local fixture for scan outcomes.
- Camera starts on entry and stops on exit, including pending-permission/start races; desktop is still usable with its original layout and controls.
- Relevant candidates: `bun test test/organizerTicketScanner.test.ts`, `bun test test/organizerEventDetailPageStateCreate.test.ts`, `bun test test/organizerUiContract.test.ts`, and the existing shell-navigation test if impacted. Confirm names before running. Do not run the full test or E2E suite.
- Browser checks at approximately 375×850 plus desktop width; verify scroll, selected details, Profile/footer overlap, camera permission/error state, and absence of unintended horizontal overflow. Use a simulated camera only if available and clearly distinguish simulated behavior from real-device scanning.
