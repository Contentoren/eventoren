import { For, Show } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import {
  dashAdminOrgsStateCreate,
  dashOrgKindLabel,
  type DashAdminOrgRow,
  type DashAdminOrgStatusFilter,
  type DashAdminOrgsSearch,
} from "./dashAdminOrgsStateCreate.ts"

const statusChips: { value: DashAdminOrgStatusFilter; label: string; tone?: "warning" }[] = [
  { value: "pruefung", label: "In Prüfung", tone: "warning" },
  { value: "aktiv", label: "Aktiv" },
  { value: "gesperrt", label: "Gesperrt" },
  { value: "alle", label: "Alle" },
]

/** Admin-Tabelle aller Organisationen mit Status-Chips, Suche und Kennzahlen. */
export function DashAdminOrgsList(p: {
  search: () => DashAdminOrgsSearch
  onPatch: (patch: Partial<DashAdminOrgsSearch>) => void
}) {
  const state = dashAdminOrgsStateCreate({ search: p.search })
  const navigate = useNavigate()

  const openOrg = (row: DashAdminOrgRow) => {
    void navigate({ to: "/demo/admin/organisationen/$orgId", params: { orgId: row.org.id } })
  }

  const columns = (): DataTableColumn<DashAdminOrgRow>[] => [
    {
      id: "org",
      header: "Organisation",
      cell: (row) => (
        <span class="flex min-w-0 items-center gap-3">
          <DashOrgLogo name={row.org.name} logoDataUrl={row.org.logoDataUrl} size="md" />
          <span class="min-w-0">
            <span class="block truncate font-medium">{row.org.name}</span>
            <span class="block truncate text-xs text-content-muted">/{row.org.slug}</span>
          </span>
        </span>
      ),
      sortValue: (row) => row.org.name,
    },
    {
      id: "kind",
      header: "Art",
      cell: (row) => <span class="whitespace-nowrap">{dashOrgKindLabel(row.org.kind)}</span>,
      sortValue: (row) => dashOrgKindLabel(row.org.kind),
      hideBelow: "lg",
    },
    {
      id: "owner",
      header: "Inhaber",
      cell: (row) => <span class="truncate">{row.ownerName}</span>,
      sortValue: (row) => row.ownerName,
      hideBelow: "md",
    },
    {
      id: "events",
      header: "Events",
      align: "right",
      cell: (row) => <span class="tabular-nums">{row.eventCount}</span>,
      sortValue: (row) => row.eventCount,
      hideBelow: "sm",
    },
    {
      id: "revenue",
      header: "Umsatz 30 Tage",
      align: "right",
      cell: (row) => <span class="tabular-nums whitespace-nowrap">{dashCentsFormat(row.revenueCents)}</span>,
      sortValue: (row) => row.revenueCents,
    },
    {
      id: "fee",
      header: "Gebühr",
      cell: (row) => <span class="whitespace-nowrap text-sm">{row.feeLabel}</span>,
      sortValue: (row) => row.feeLabel,
      hideBelow: "xl",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <DashStatusPill kind="org" value={row.org.status} />,
    },
  ]

  return (
    <div class="flex flex-col gap-4">
      <div class="flex flex-col gap-3">
        <label class="relative min-w-52 max-w-md">
          <span class="sr-only">Organisationen suchen</span>
          <Icon
            path={mdiMagnify as unknown as string}
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
          />
          <Input
            type="search"
            value={state.qDraft.get()}
            onInput={(event) => {
              const value = event.currentTarget.value
              state.qDraft.set(value)
              p.onPatch({ q: value })
            }}
            placeholder="Name, Slug, Inhaber …"
            aria-label="Organisationen suchen"
            class="h-9 pl-9 text-sm rounded-control"
          />
        </label>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Status filtern">
          <For each={statusChips}>
            {(chip) => (
              <FilterChip
                active={p.search().status === chip.value}
                onClick={() => p.onPatch({ status: chip.value })}
                count={state.counts()[chip.value]}
                tone={chip.tone}
              >
                {chip.label}
              </FilterChip>
            )}
          </For>
        </div>
      </div>
      <DataTable
        rows={state.filtered()}
        rowKey={(row) => row.org.id}
        columns={columns()}
        ariaLabel="Organisationen"
        onRowClick={openOrg}
        mobileCard={(row) => (
          <div class="flex flex-col gap-1.5 text-sm">
            <div class="flex items-center justify-between gap-2">
              <span class="flex min-w-0 items-center gap-2">
                <DashOrgLogo name={row.org.name} logoDataUrl={row.org.logoDataUrl} size="sm" />
                <span class="truncate font-medium">{row.org.name}</span>
              </span>
              <DashStatusPill kind="org" value={row.org.status} size="sm" />
            </div>
            <div class="truncate text-xs text-content-muted">
              {dashOrgKindLabel(row.org.kind)} · {row.ownerName}
            </div>
            <div class="flex items-center justify-between gap-2 text-content-muted">
              <span>
                {row.eventCount} {row.eventCount === 1 ? "Event" : "Events"} · {row.feeLabel}
              </span>
              <span class="tabular-nums font-medium text-content">{dashCentsFormat(row.revenueCents)}</span>
            </div>
          </div>
        )}
        empty={
          <span class="inline-flex flex-col items-center gap-2">
            <Icon path={mdiDomain} class="size-7 text-content-muted" />
            <Show
              when={dashStateGet().orgs.length === 0}
              fallback={<span>Keine Organisation entspricht dem Filter.</span>}
            >
              <span>Keine Organisationen vorhanden.</span>
            </Show>
          </span>
        }
        footer={
          <span class="text-sm text-content-muted">
            {state.filtered().length} von {state.rows().length}{" "}
            {state.rows().length === 1 ? "Organisation" : "Organisationen"}
          </span>
        }
      />
    </div>
  )
}
