import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashMessageKind } from "../../../model/dashMessageKindSchema.ts"
import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { dashMessageKindLabel, dashMessageMetaText } from "../dashMessagesText.ts"

const kindColor: Record<DashMessageKind, string> = {
  info: "bg-surface-muted text-content",
  aenderung: "bg-surface-muted text-content",
  absage: "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-200",
  erinnerung: "bg-surface-muted text-content",
}

/** Nachrichtenliste: Betreff, Art, Empfänger, Status, Datum, Öffnungsrate. */
export function DashMessagesList(p: { rows: DashMessage[]; onSelect: (row: DashMessage) => void; empty: string }) {
  const columns = (): DataTableColumn<DashMessage>[] => [
    {
      id: "betreff",
      header: "Betreff",
      cell: (row) => <span class="font-medium">{row.subject}</span>,
      sortValue: (row) => row.subject,
    },
    {
      id: "art",
      header: "Art",
      width: "w-32",
      cell: (row) => (
        <span
          class={`inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${kindColor[row.kind]}`}
        >
          {dashMessageKindLabel(row.kind)}
        </span>
      ),
      sortValue: (row) => row.kind,
      hideBelow: "md",
    },
    {
      id: "empfaenger",
      header: "Empfänger",
      align: "right",
      cell: (row) => <span class="tabular-nums">{row.recipientCount}</span>,
      sortValue: (row) => row.recipientCount,
      hideBelow: "sm",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <DashStatusPill kind="message" value={row.status} />,
      sortValue: (row) => row.status,
    },
    {
      id: "datum",
      header: "Datum",
      cell: (row) => (
        <span class="whitespace-nowrap text-sm text-content-muted">
          {row.sentAt
            ? dashDateFormat(row.sentAt, "datum")
            : row.scheduledAt
              ? dashDateFormat(row.scheduledAt, "datum")
              : "–"}
        </span>
      ),
      sortValue: (row) => row.sentAt ?? row.scheduledAt ?? "",
      hideBelow: "lg",
    },
    {
      id: "rate",
      header: "Geöffnet",
      align: "right",
      cell: (row) => (
        <span class="whitespace-nowrap text-sm text-content-muted">
          {row.openRateBps === null ? "–" : `${(row.openRateBps / 100).toLocaleString("de-DE")}%`}
        </span>
      ),
      sortValue: (row) => row.openRateBps ?? -1,
      hideBelow: "lg",
    },
  ]

  return (
    <DataTable
      rows={p.rows}
      rowKey={(row) => row.id}
      columns={columns()}
      ariaLabel="Nachrichten"
      onRowClick={p.onSelect}
      empty={<EmptyState icon={mdiEmailOutline} title="Noch keine Nachrichten" description={p.empty} />}
      mobileCard={(row) => (
        <span class="flex flex-col gap-1">
          <span class="flex items-center justify-between gap-2">
            <span class="font-medium">{row.subject}</span>
            <DashStatusPill kind="message" value={row.status} />
          </span>
          <span class="text-xs text-content-muted">{dashMessageMetaText(row)}</span>
        </span>
      )}
    />
  )
}
