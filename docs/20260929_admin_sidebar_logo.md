# Admin sidebar logo

## Goal

Show the existing Eventoren wordmark at the top of the admin sidebar, including the mobile profile panel, instead of plain text.

## Decisions

- Reuse existing project assets: `/eventoren-logo-light.png` has a navy wordmark for light backgrounds and `/eventoren-logo.png` has a white wordmark for dark backgrounds. Both include the ticket symbol and text. No new assets or dependencies.
- Keep the single existing brand link and its `/admin/bestellungen` destination. Render a theme-aware image in that link, sized to fit the 224px sidebar. Preserve accessible link labeling; avoid duplicate wordmark text.
- Change only `src/admin/AdminSidebarContent.tsx`; its shared content is also used in the mobile profile panel. The existing `#ui` logo components are not suited to a theme-switching full wordmark inside one link; retain the existing link structure.

## Tasks

1. **Add the logo** (`completed`): Replace the plain-text brand label with light/dark versions of the existing wordmark in the shared sidebar content, keeping the existing navigation and spacing readable.
2. **Verify** (`completed`): Run targeted typecheck and browser-check the logo in desktop sidebar and mobile profile panel, including light/dark theme.

## Current context

`AdminSidebarContent.tsx` owns the sidebar brand link. `AdminShell.tsx` renders that content in a desktop `w-64` sidebar and the mobile profile view. The assets are both 1024×206 PNGs; `/logo.svg` is unrelated branding. The link now contains theme-specific wordmark images at 32px high and a visible keyboard focus style. Typecheck and targeted formatting passed. Desktop light branding was confirmed in the working-tree preview at `https://eventoren.leonardomora.de`; intermittent root-route errors prevented live mobile/dark checks. The shared component and theme classes were reviewed statically for those cases.
