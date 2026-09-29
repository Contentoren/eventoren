# Sidebar account popover

## Goal
Show only the signed-in user's name with an account icon in the sidebar account area. Clicking it opens a popover containing the remaining account information and configuration options.

## Decisions
- Preserve the existing email, role/area label, theme, list-view preference (when available), and logout behavior.
- Reuse the existing `#ui` popover component and current sidebar styling conventions.
- Apply the same behavior wherever `AdminSidebarContent` is used, including mobile.

## Tasks
1. Replace the expanded inline account block with a name-and-icon popover trigger; move the other information and actions into the popover. Verify with focused checks.
2. Browser-check desktop and mobile sidebar account behavior and repair any issues found.

## Status
- Task 1: complete
- Task 2: complete on production

## Current context
- Account block: `src/admin/AdminSidebarContent.tsx`.
- Existing labeled popover: `ui/interactive/popover/CorvuPopover.tsx`.
- Sidebar is reused by `src/admin/AdminShell.tsx` for desktop and mobile.
- The account trigger and popover are implemented in `AdminSidebarContent.tsx`; formatting and typecheck passed.
- Production `eventoren.de` authenticated admin was verified on desktop and mobile: the name trigger opens the account controls and closes again. Development preview `eventoren.leonardomora.de` remains blocked by an authenticated admin-route/SSO error.
