# Admin sidebar redesign

## Goal
Replace the public navigation on `/admin` with a responsive CRM-inspired administration shell. Provide separate German-language pages for Bestellungen, Events, Veranstalter, Mitglieder, with theme switching and a user/sign-out control.

## Decisions
- User confirmed real overview pages: Bestellungen lists all orders; Veranstalter lists members with the organizer role.
- Preserve existing event and member administration behavior and existing admin/dev authorization.
- Use `/admin/bestellungen`, `/admin/events`, `/admin/veranstalter`, `/admin/mitglieder`. `/admin` redirects to `/admin/bestellungen`.
- No public shopping-cart navbar in the admin area. Public pages remain unchanged.
- Reuse existing `#ui/...` components, installed dependencies, authentication, theme, and logout mechanisms. Reference `../crm` shell styling and responsive behavior without copying CRM-specific business logic.
- All non-exploratory redesign implementation is delegated to sol-medium as requested.

## Approach
1. Implement the responsive shell, nested routes, Events and Mitglieder separation, and real protected order/organizer overview pages. Keep data work limited to read access required by those pages; no new order workflows.
2. Independently review route authorization, data access, and preservation of existing functionality; correct specific issues if needed.
3. Verify desktop/mobile behavior, active navigation, themes, user sign-out and admin access using the browser; run relevant code checks.

## Tasks and status
- Task 1: Implement shell and route split, preserving existing functionality — completed.
- Task 2: Implement real admin order and organizer overview content — completed.
- Task 3: Review and verify changes, fix confirmed defects — completed.

## Current context
The protected `/admin` parent renders a responsive sidebar and child outlet. Events and Mitglieder are separate pages. Bestellungen uses a paginated admin/dev-only all-orders query; Veranstalter filters the protected member directory for active organizer grants. The query is available on the existing development backend. Public routes retain their existing behavior. User-menu rendering is mount-aware for consistent SSR hydration, and Corvu dependencies are transformed for SSR. CRM reference components are under `../crm/src/shell/shell_ui/`; Eventoren reusable sidebar/theme components are under `ui/interactive/`.
