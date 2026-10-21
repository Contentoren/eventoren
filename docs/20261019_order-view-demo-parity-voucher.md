# Order View Demo Parity + Voucher Column (2026-10-19)

## Goal

Align dashboard order view (`DashOrdersPage` / `DashOrdersList` / `DashOrderSheet`) with demo at https://eventoren.de/demo/dashboard/bestellungen, plus add voucher-consumed column (icon only, click for details + link to full voucher).

## Scope

- In: `src/dash/pages/orders/**`, `src/dash/model/dashOrder*.ts` (read-only unless trivial), export helper call in `DashOrdersPage`, mobile card in `DashOrdersList`.
- Out: `src/routes/admin.bestellungen.tsx`, `src/routes/bestellungen.tsx` (admin + customer views untouched), Convex backend / schema changes, new npm libs, e2e suite.

## Decisions

- Scope = Dashboard only (demo URL is dashboard view; admin/customer untouched).
- Parity = full table + drawer to match demo (columns, order, pills, responsive, drawer sections/actions).
- Voucher column = icon only (`mdiGiftOutline`), placed after Betrag, before Zahlart, header "Gutschein". Empty when no voucher. Tooltip shows code + amount. Sortable by code.
- Click = inline popover/dialog with code + copy button, redeemed amount, voucher balance/status (resolved via `dashStateGet().vouchers`), plus link to Gutscheine detail (`?gutschein=<voucherId>`). Stop propagation so row click does not open order sheet.
- Voucher row in `DashOrderSheet` Zahlung section becomes same clickable control (reuses popover component).
- Export + mobile: add Gutschein-Code / Gutschein-Betrag to CSV/XLSX/PDF export and gift badge on mobile cards. No new "only with voucher" filter.
- Use existing `package.json` libs only (`@adaptive-ds/mdi`, `#ui/*`, `dashStateGet`, `CopyButton`, existing popover/dialog primitives).

## Approach

- Resolve voucher display from `order.voucher` snapshot (`voucherId`, `code`, `amountCents`); enrich with `dashStateGet().vouchers.find(v => v.id === voucherId)` for balance/status/redemptions count.
- New small component `DashOrderVoucherBadge.tsx` (icon button + popover) reused by table cell, mobile card, and sheet payment row.
- Table column: `id: "gutschein"`, `align: "center"`, `hideBelow: "md"`, `sortValue: code`.
- Export: extend `exportRun` columns/rows in `DashOrdersPage` with Gutschein-Code + Gutschein-Betrag.
- Demo parity: keep existing structure; adjust column order/labels, relative dates, status pills, drawer header/summary/payment/timeline/footer to match demo screenshots. No redesign beyond demo.

## Tasks

1. Table voucher column + `DashOrderVoucherBadge` popover (list cell, stop propagation, tooltip, copy, balance/status, link to `?gutschein=`).
2. Sheet voucher row clickable (reuse badge/popover) + drawer demo-parity fixes (header, summary, payment breakdown, timeline, footer actions).
3. Export columns + mobile card badge + table/toolbar parity polish (column order, responsive hides, counts, "Mehr laden" footer).
4. Verification: typecheck + targeted unit tests only (no full/e2e per task); final browser spot-check of list + drawer + voucher popover.

## Status

- [x] Task 1 done (DashOrderVoucherBadge + gutschein column)
- [x] Task 2 done (sheet voucher badge + drawer parity label)
- [x] Task 3 done (export columns + mobile badge)
- [x] Task 4 done (11 tests pass; browser spot-check skipped after repeated runner restarts)

## Current context

- All implementation tasks reported complete; running final verification.
