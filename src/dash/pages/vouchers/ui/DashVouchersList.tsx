import { Show } from "solid-js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { dashVoucherStatusResolve } from "../../../store/actions/vouchers/dashVoucherStatusResolve.ts"
import { dashVoucherExpiryText, dashVoucherRecipientText } from "../dashVoucherText.ts"
import type { DashVoucherListRow } from "../dashVoucherListFilter.ts"

export type DashVouchersRow = DashVoucherListRow

/** Gutscheintabelle: Code mit Kopie, Empfänger, Wert, Restguthaben-Balken, Ablauf, Status. */
export function DashVouchersList(p: {
  rows: DashVoucherListRow[]
  now: Date
  onSelect: (row: DashVoucherListRow) => void
  empty: string
}) {
  const columns = (): DataTableColumn<DashVouchersRow>[] => [
    {
      id: "code",
      header: "Code",
      cell: (row) => (
        <span class="inline-flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          <span class="font-mono text-[13px] font-semibold">{row.voucher.code}</span>
          <CopyButton value={row.voucher.code} ariaLabel={`Code ${row.voucher.code} kopieren`} />
        </span>
      ),
      sortValue: (row) => row.voucher.code,
    },
    {
      id: "empfaenger",
      header: "Empfänger",
      cell: (row) => (
        <span class="flex min-w-0 flex-col">
          <span class="truncate text-sm">{dashVoucherRecipientText(row.voucher)}</span>
          <Show when={row.voucher.recipientName.trim().length > 0 && row.voucher.recipientEmail.trim().length > 0}>
            <span class="truncate text-xs text-content-muted">{row.voucher.recipientEmail}</span>
          </Show>
        </span>
      ),
      sortValue: (row) => dashVoucherRecipientText(row.voucher),
    },
    {
      id: "wert",
      header: "Wert",
      align: "right",
      cell: (row) => <DashMoney cents={row.voucher.initialCents} />,
      sortValue: (row) => row.voucher.initialCents,
    },
    {
      id: "rest",
      header: "Restguthaben",
      cell: (row) => (
        <span class="flex min-w-28 flex-col gap-1">
          <span class="text-xs tabular-nums text-content-muted">
            <DashMoney cents={row.voucher.balanceCents} muted /> von {dashCentsFormat(row.voucher.initialCents)}
          </span>
          <ProgressBar
            value={row.voucher.balanceCents}
            max={Math.max(row.voucher.initialCents, 1)}
            size="sm"
            label={`Restguthaben ${dashCentsFormat(row.voucher.balanceCents)} von ${dashCentsFormat(row.voucher.initialCents)}`}
          />
        </span>
      ),
      sortValue: (row) => row.voucher.balanceCents,
      hideBelow: "sm",
    },
    {
      id: "ablauf",
      header: "Ablauf",
      cell: (row) => (
        <span class="whitespace-nowrap text-sm text-content-muted">{dashVoucherExpiryText(row.voucher)}</span>
      ),
      sortValue: (row) => row.voucher.expiresAt ?? "9999",
      hideBelow: "lg",
    },
    {
      id: "status",
      header: "Status",
      align: "center",
      cell: (row) => <DashStatusPill kind="voucher" value={dashVoucherStatusResolve(row.voucher, p.now)} />,
    },
  ]

  return (
    <DataTable
      rows={p.rows}
      rowKey={(row) => row.voucher.id}
      columns={columns()}
      ariaLabel="Gutscheine"
      onRowClick={p.onSelect}
      activeRowKey={null}
      mobileCard={(row) => (
        <span class="flex flex-col gap-1">
          <span class="flex items-center justify-between gap-2">
            <span class="font-mono text-[13px] font-semibold">{row.voucher.code}</span>
            <DashStatusPill kind="voucher" value={dashVoucherStatusResolve(row.voucher, p.now)} size="sm" />
          </span>
          <span class="text-sm">
            {dashVoucherRecipientText(row.voucher)} · <DashMoney cents={row.voucher.initialCents} />
          </span>
          <span class="text-xs text-content-muted">
            Rest <DashMoney cents={row.voucher.balanceCents} muted /> · {dashVoucherExpiryText(row.voucher)}
          </span>
        </span>
      )}
      empty={
        <span class="inline-flex flex-col items-center gap-2 py-8">
          <EmptyState icon={mdiGiftOutline} title="Keine Gutscheine" description={p.empty} />
        </span>
      }
    />
  )
}
