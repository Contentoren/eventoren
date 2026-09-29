# Ticket products page redesign

## Goal

Make the admin event Ticketprodukte tab compact, clean, and attractive on desktop and mobile. Remove the desktop two-column composition that leaves a large empty lower-left area, and soften unnecessary hard borders/separators without altering ticket-product behavior.

## Decisions

- Replace the narrow left list plus tall right editor with a full-width product selector above the editor. Show existing products as compact, scannable cards in a responsive grid on desktop and stacked compact rows on mobile. Keep the new-product action easy to find.
- Use a restrained visual hierarchy: subtle selected state, soft background treatment, comfortable but compact spacing, and no heavy nested card border/shadow. The editor should read as one cohesive workspace, not a floating side panel.
- Preserve product selection, drag reordering (including an understandable cue), sold/available/capacity figures, add/new, save/delete, date/admission controls, errors, labels/IDs, and the new-event draft flow. No backend/state contract changes.
- Use existing `#ui` primitives and existing project libraries; do not add unrelated dependencies or assets. Keep unrelated admin pages unchanged.

## Tasks

1. **Implement the Ticketprodukte presentation** (`completed`): Redesign `src/admin/AdminTicketProductsForm.tsx` layout and styling, and only if needed the immediate event-tab chrome in `AdminEventTabs.tsx` / `AdminEventDetailPage.tsx`. Preserve the state wiring and all user actions. Keep form fields readable at both widths; avoid unbounded three-column datetime fields on smaller desktop widths.
2. **Verify and refine** (`completed`): Run targeted typecheck/test for the changed code, then review the page in a real browser at desktop and mobile widths. Fix any visual, responsive, accessibility, or interaction regressions within the same narrow scope.

## Current context

The form now places a responsive product selector above a full-width editor; presentation changes are confined to `AdminTicketProductsForm.tsx`. Mobile product rows were compacted, narrow datetime padding adjusted, and the selected unsaved-draft indicator made noninteractive. The canonical Vite preview at `https://eventoren.leonardomora.de/admin/events/pilates-christmas-event-2027-final?tab=products` served the changed working tree. Desktop, 1024px, 390px, and 320px browser checks found no horizontal overflow; product selection and starting a new draft worked without saving. Mobile card height measured 76px at 390px and 100px at 320px. Form actions remain reachable despite the pre-existing fixed quick-navigation overlay. `bun run typecheck` and `bun test test/adminTicketProductsFormStateCreate.test.ts` passed after the final code change.
