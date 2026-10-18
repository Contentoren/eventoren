import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { For, Show } from "solid-js"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import type { DashEventsPageState } from "../dashEventsPageStateCreate.ts"
import type { DashEventListRow } from "../model/dashEventListFilter.ts"
import { dashEventsRowMenuCreate } from "./dashEventsRowMenuCreate.ts"

export interface DashEventsTilesProps {
  state: DashEventsPageState
  rows: Array<DashEventListRow>
}

const monthShort = new Intl.DateTimeFormat("de-DE", { month: "short", timeZone: "Europe/Berlin" })
const dayNumber = new Intl.DateTimeFormat("de-DE", { day: "numeric", timeZone: "Europe/Berlin" })

/** Eventkacheln: Bild 16:9 mit Datums-Badge, Status-Pill, Verkauf und Umsatz. */
export function DashEventsTiles(p: DashEventsTilesProps) {
  return (
    <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <For each={p.rows}>
        {(row) => (
          <li class="overflow-hidden rounded-card border border-border-subtle bg-surface transition-shadow hover:shadow-sm">
            <div class="relative">
              <span onClick={() => p.state.openEvent(row.event.id)} class="block cursor-pointer">
                <Show
                  when={row.event.imageUrl}
                  fallback={<span class="block aspect-video w-full bg-surface-muted" aria-hidden="true" />}
                >
                  <img src={row.event.imageUrl} alt="" loading="lazy" class="aspect-video w-full object-cover" />
                </Show>
              </span>
              <span
                aria-hidden="true"
                class="absolute left-2 top-2 flex min-w-11 flex-col items-center rounded-control bg-surface px-1.5 py-1 shadow-sm"
              >
                <span class="text-[11px] font-medium uppercase leading-none text-content-muted">
                  {monthShort.format(new Date(row.event.startsAt))}
                </span>
                <span class="text-base font-semibold leading-tight tabular-nums text-content">
                  {dayNumber.format(new Date(row.event.startsAt))}
                </span>
              </span>
              <span class="absolute right-2 top-2">
                <DashStatusPill kind="event" value={p.state.phaseOf(row.event)} size="sm" />
              </span>
            </div>
            <div class="flex flex-col gap-2 p-4">
              <span onClick={() => p.state.openEvent(row.event.id)} class="block cursor-pointer">
                <span class="block truncate text-sm font-semibold text-content">{row.event.title}</span>
                <span class="mt-0.5 block truncate text-sm text-content-muted">
                  {dashDateFormat(row.event.startsAt, "wochentag-datum")} · {dashDateFormat(row.event.startsAt, "zeit")}{" "}
                  · {row.event.venue.city}
                </span>
              </span>
              <ProgressBar
                value={row.stats.sold}
                max={row.stats.capacity}
                size="sm"
                label={`Verkaufte Tickets für ${row.event.title}`}
              />
              <span class="flex items-center justify-between gap-2">
                <span class="text-xs tabular-nums text-content-muted">
                  {row.stats.sold} / {row.stats.capacity}
                </span>
                <Show when={p.state.canSeeRevenue()}>
                  <span class="text-sm font-semibold tabular-nums text-content">
                    {dashCentsFormat(row.stats.revenueCents)}
                  </span>
                </Show>
              </span>
              <span class="flex justify-end">
                <DropdownMenu
                  items={dashEventsRowMenuCreate({
                    event: row.event,
                    canEdit: p.state.canEdit(),
                    onOpen: () => p.state.openEvent(row.event.id),
                    onViewPublic: () => p.state.viewPublic(row.event),
                    onDuplicate: () => p.state.openDialog(row.event.id, "duplizieren"),
                    onSaveTemplate: () => p.state.openDialog(row.event.id, "vorlage-speichern"),
                    onToggleSales: () => p.state.toggleSales(row.event),
                    onCancel: () => p.state.openDialog(row.event.id, "absagen"),
                  })}
                  triggerIcon={mdiDotsHorizontal}
                  triggerAriaLabel={`Aktionen für ${row.event.title}`}
                />
              </span>
            </div>
          </li>
        )}
      </For>
    </ul>
  )
}
