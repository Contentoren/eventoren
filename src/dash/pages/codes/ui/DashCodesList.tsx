import { For, Show } from "solid-js"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import type { DashCode } from "../../../model/dashCodeSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashCodeUsageText, dashCodeValidityText, dashCodeValueText } from "../dashCodeText.ts"

export type DashCodesRow = DashCode

/** Codetabelle mit Mono-Code, Wert, Gilt-für-Chips, Nutzung, Gültigkeit und Aktiv-Schalter. */
export function DashCodesList(p: {
  rows: DashCode[]
  types: DashTicketType[]
  selectedKeys: string[]
  onSelectedKeysChange: (keys: string[]) => void
  onSelect: (row: DashCode) => void
  onToggleActive: (row: DashCode, active: boolean) => void
  canEdit: boolean
  bulkActions: (keys: string[]) => import("solid-js").JSX.Element
  empty: import("solid-js").JSX.Element
}) {
  const typeName = (id: string) => p.types.find((type) => type.id === id)?.name ?? id

  const columns = (): DataTableColumn<DashCodesRow>[] => [
    {
      id: "code",
      header: "Code",
      cell: (row) => (
        <span class="inline-flex items-center gap-1.5" onClick={(event) => event.stopPropagation()}>
          <span class="whitespace-nowrap font-mono text-sm font-semibold">{row.code}</span>
          <CopyButton value={row.code} ariaLabel={`Code ${row.code} kopieren`} class="size-8 p-1.5" />
        </span>
      ),
      sortValue: (row) => row.code,
    },
    {
      id: "wert",
      header: "Wert",
      cell: (row) => <span class="whitespace-nowrap">{dashCodeValueText(row, p.types)}</span>,
      sortValue: (row) => (row.kind === "rabatt" ? (row.discount?.value ?? 0) : 1_000_000 + row.ticketTypeIds.length),
    },
    {
      id: "gilt",
      header: "Gilt für",
      cell: (row) =>
        row.ticketTypeIds.length === 0 ? (
          <span class="text-content-muted">Alle</span>
        ) : (
          <span class="inline-flex max-w-56 flex-wrap gap-1">
            <For each={row.ticketTypeIds.slice(0, 3)}>
              {(id) => (
                <span class="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs">
                  {typeName(id)}
                </span>
              )}
            </For>
            <Show when={row.ticketTypeIds.length > 3}>
              <span class="inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs">
                +{row.ticketTypeIds.length - 3}
              </span>
            </Show>
          </span>
        ),
      hideBelow: "md",
    },
    {
      id: "nutzung",
      header: "Nutzung",
      cell: (row) => (
        <span class="flex min-w-28 flex-col gap-1">
          <span class="text-xs tabular-nums text-content-muted">{dashCodeUsageText(row)}</span>
          <ProgressBar
            value={row.usedTickets}
            max={row.maxTickets ?? Math.max(row.usedTickets, 1)}
            size="sm"
            label={`Nutzung ${dashCodeUsageText(row)}`}
          />
        </span>
      ),
      sortValue: (row) => row.usedTickets,
      hideBelow: "sm",
    },
    {
      id: "gueltig",
      header: "Gültig",
      cell: (row) => <span class="whitespace-nowrap text-sm text-content-muted">{dashCodeValidityText(row)}</span>,
      sortValue: (row) => row.validUntil ?? row.validFrom ?? "",
      hideBelow: "lg",
    },
    {
      id: "aktiv",
      header: "Aktiv",
      align: "center",
      cell: (row) => (
        <span onClick={(event) => event.stopPropagation()}>
          <ToggleSwitch
            checked={row.active}
            onChange={(checked) => p.onToggleActive(row, checked)}
            label={row.active ? "Aktiv" : "Inaktiv"}
            disabled={!p.canEdit}
          />
        </span>
      ),
    },
  ]

  return (
    <DataTable
      rows={p.rows}
      rowKey={(row) => row.id}
      columns={columns()}
      ariaLabel="Codes"
      onRowClick={p.onSelect}
      activeRowKey={null}
      selectable={p.canEdit}
      selectedKeys={p.selectedKeys}
      onSelectedKeysChange={p.onSelectedKeysChange}
      bulkActions={p.bulkActions}
      mobileCard={(row) => (
        <span class="flex flex-col gap-1">
          <span class="flex items-center justify-between gap-2">
            <span class="font-mono text-[13px] font-semibold">{row.code}</span>
            <span class="text-xs text-content-muted">{dashCodeValidityText(row)}</span>
          </span>
          <span class="text-sm">{dashCodeValueText(row, p.types)}</span>
          <span class="text-xs text-content-muted">
            {dashCodeUsageText(row)} ·{" "}
            {row.validUntil ? `bis ${dashDateFormat(row.validUntil, "datum")}` : "zeitlich unbegrenzt"}
          </span>
        </span>
      )}
      empty={p.empty}
    />
  )
}
