# Admin Order View Demo Parity + Voucher Column (2026-10-20)

## Goal

Bring `/admin/bestellungen` (`AdminTicketOrdersPage` + `AdminTicketOrderDetailsPanel`) in line with the demo order view at https://eventoren.de/demo/dashboard/bestellungen (columns, filters, detail content), plus the voucher-consumed column (icon only, click for code details). The earlier dashboard work stays as is; this plan covers the admin view the user actually uses.

## Scope

- In: `src/routes/admin.bestellungen.tsx` (loader only if needed), `src/admin/AdminTicketOrdersPage.tsx`, `src/admin/AdminTicketOrderDetailsPanel.tsx`, admin order/voucher model + filter helpers if trivially needed, new small admin voucher badge component if dash reuse is not importable.
- Out: `src/dash/**` (done, untouched), `src/routes/bestellungen.tsx` (customer view untouched), Convex backend / schema changes, new npm libs, e2e suite.

## Decisions (locked 2026-10-20)

- Target = admin only (`/admin/bestellungen`); dashboard work stays as-is.
- Backend = add voucher snapshot to `ticketOrders` + admin queries + checkout write path, then admin column/popover. Contract: `voucher?: { voucherId?: string; code: string; amountCents: number } | null` on `AdminTicketOrderSummary` + `AdminTicketOrderDetails`.
- Parity = full (sorting, status chips, export, drawer-style detail). Keep `Eventdatum` as lg-only extra. Keep list/tiles toggle; both open the drawer (no inline expand).
- Detail = convert to right-side drawer (`#ui` Sheet) with Käufer/Tickets/Zahlung/Verlauf sections + actions where data exists; drop inline `AdminTicketOrderDetailsPanel` expand (rework panel content into drawer, keep Stripe section collapsed/secondary).
- Voucher popover = snapshot only: code + copy + redeemed amount; no balance/status (no admin voucher entity), no link (no `/admin/gutscheine` route).
- Reuse `CorvuPopoverIcon` + `CopyButton` + `mdiGiftOutline`; admin-local badge (no admin→dash import). Existing `package.json` libs only.

## Approach (ordered)

1. Backend: schema + checkout write + `ticketOrderListAdminPaginatedQuery` + `ticketOrderGetAdminQuery` surface `voucher` per contract.
2. Admin table: columns reorder/rename to demo (Bestellnummer→Nummer first? match demo: Nummer, Kunde→Käufer, Event, Tickets new, Betrag, Gutschein new icon-only, Zahlart new from paymentMethodType mapped, Bestellt→Datum relative, Eventdatum lg-only, Status), add sorting, status chips (map backend status to Alle/Bezahlt/Offen/Storniert/Erstattet where mappable), keep search + event selector, keep column-resize working with sort headers.
3. Drawer + voucher badge + export: new `AdminOrderVoucherBadge` (snapshot popover), drawer component reusing panel content, export CSV/XLSX/PDF incl. Gutschein-Code/Betrag, tiles cards open drawer too.
4. Verify: `bun test src/admin/` targeted + typecheck touched files; browser spot-check `/admin/bestellungen` via testadmin (list, sort, chips, voucher popover, drawer, export).

## Tasks

1. Explore admin data sources + mechanics (done — see findings below).
2. Backend voucher snapshot (schema + checkout write + admin queries).
3. Admin table parity (columns, sorting, chips; no voucher column yet).
4. Drawer conversion + voucher badge/popover + export.
5. Verification: targeted tests + browser spot-check (no full/e2e).

## Status

- [x] Task 1 done
- [~] Task 2 partial (schema + queries + types done; checkout write = TODO comment, no voucher flow exists — column renders empty state until then)
- [x] Task 3 done (columns reorder/rename, 9-wide widths, ticketCount in summary, sorting, status chips)
- [x] Task 4a done (AdminOrderVoucherBadge + Gutschein column + tiles + CSV export with Gutschein-Code/Betrag)
- [x] Task 4b done (AdminTicketOrderDrawer via #ui Sheet; list + tiles open drawer; Käufer/Tickets/Zahlung+Gutschein/Verlauf; Stripe collapsed)
- [ ] Task 5 in progress (verification: targeted tests + browser spot-check)

## Current context

- Voucher column + export complete. Next: drawer conversion only.
