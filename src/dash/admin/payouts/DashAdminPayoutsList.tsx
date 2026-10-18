import { Show } from "solid-js"
import { mdiBankTransfer } from "@adaptive-ds/mdi/mdiBankTransfer.js"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashIbanMask } from "../../model/dashIbanMask.ts"
import { DashMoney } from "../../ui/money/DashMoney.tsx"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import type { DashAdminPayoutRow } from "./dashAdminPayoutsStateCreate.ts"

/** Admin-Auszahlungstabelle mit Auswahl bereiter Zeilen und mobiler Karte. */
export function DashAdminPayoutsList(p: {
  rows: () => DashAdminPayoutRow[]
  selectedKeys: () => string[]
  onSelectedKeysChange: (keys: string[]) => void
  onSelect: (row: DashAdminPayoutRow) => void
  bulkActions: (keys: string[]) => import("solid-js").JSX.Element
  empty: import("solid-js").JSX.Element
}) {
  const columns = (): DataTableColumn<DashAdminPayoutRow>[] => [
    {
      id: "org",
      header: "Organisation",
      cell: (row) => (
        <span class="flex min-w-0 items-center gap-3">
          <DashOrgLogo name={row.orgName} logoDataUrl={row.orgLogo} size="md" />
          <span class="truncate font-medium">{row.orgName}</span>
        </span>
      ),
      sortValue: (row) => row.orgName,
    },
    {
      id: "event",
      header: "Event",
      cell: (row) => <span class="truncate">{row.eventTitle}</span>,
      sortValue: (row) => row.eventTitle,
    },
    {
      id: "ende",
      header: "Eventende",
      align: "right",
      cell: (row) => <span class="whitespace-nowrap">{dashDateFormat(row.eventEndsAt, "datum")}</span>,
      sortValue: (row) => row.eventEndsAt,
      hideBelow: "md",
    },
    {
      id: "betrag",
      header: "Betrag",
      align: "right",
      cell: (row) => <DashMoney cents={row.payout.amountCents} />,
      sortValue: (row) => row.payout.amountCents,
    },
    {
      id: "faellig",
      header: "Fällig",
      align: "right",
      cell: (row) => <span class="whitespace-nowrap">{dashDateFormat(row.payout.dueAt, "datum")}</span>,
      sortValue: (row) => row.payout.dueAt,
      hideBelow: "sm",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <DashStatusPill kind="payout" value={row.payout.status} size="sm" />,
    },
    {
      id: "referenz",
      header: "Referenz",
      cell: (row) => <span class="font-mono text-[13px]">{row.payout.reference}</span>,
      sortValue: (row) => row.payout.reference,
      hideBelow: "lg",
    },
    {
      id: "iban",
      header: "IBAN",
      cell: (row) => <span class="whitespace-nowrap font-mono text-[13px]">{dashIbanMask(row.orgIban)}</span>,
      sortValue: (row) => row.orgIban,
      hideBelow: "xl",
    },
  ]

  return (
    <DataTable
      rows={p.rows()}
      rowKey={(row) => row.payout.id}
      columns={columns()}
      ariaLabel="Auszahlungen"
      onRowClick={p.onSelect}
      selectable
      selectedKeys={p.selectedKeys()}
      onSelectedKeysChange={p.onSelectedKeysChange}
      bulkActions={p.bulkActions}
      mobileCard={(row) => (
        <span class="flex flex-col gap-1.5 text-sm">
          <span class="flex items-center justify-between gap-2">
            <span class="flex min-w-0 items-center gap-2">
              <DashOrgLogo name={row.orgName} logoDataUrl={row.orgLogo} size="sm" />
              <span class="truncate font-medium">{row.orgName}</span>
            </span>
            <DashStatusPill kind="payout" value={row.payout.status} size="sm" />
          </span>
          <span class="truncate text-content-muted">{row.eventTitle}</span>
          <span class="flex items-center justify-between gap-2 text-content-muted">
            <span>
              {dashDateFormat(row.eventEndsAt, "datum")} · fällig {dashDateFormat(row.payout.dueAt, "datum")}
            </span>
            <DashMoney cents={row.payout.amountCents} class="font-medium text-content" />
          </span>
          <span class="font-mono text-xs text-content-muted">
            {row.payout.reference} · {dashIbanMask(row.orgIban)}
          </span>
        </span>
      )}
      empty={
        <span class="inline-flex flex-col items-center gap-2">
          <Icon path={mdiBankTransfer} class="size-7 text-content-muted" />
          <Show when={true} fallback={p.empty}>
            {p.empty}
          </Show>
        </span>
      }
    />
  )
}
