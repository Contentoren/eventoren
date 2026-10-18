import { mdiCalendarOutline } from "@adaptive-ds/mdi/mdiCalendarOutline.js"
import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { mdiMapMarkerOutline } from "@adaptive-ds/mdi/mdiMapMarkerOutline.js"
import { For, Show } from "solid-js"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import type { DashEventsPageState } from "../dashEventsPageStateCreate.ts"
import type { DashEventListRow } from "../model/dashEventListFilter.ts"
import { dashEventsRowMenuCreate } from "./dashEventsRowMenuCreate.ts"

export interface DashEventsListProps {
  state: DashEventsPageState
  rows: Array<DashEventListRow>
}

/** Eventliste als Karten-Zeilen: Thumbnail, Titel, Datum, Status, Verkauf und Menü. */
export function DashEventsList(p: DashEventsListProps) {
  return (
    <div class="overflow-hidden rounded-card border border-border-subtle bg-surface">
      <ul>
        <For each={p.rows}>
          {(row) => (
            <li class="border-b border-border-subtle last:border-b-0">
              <div
                onClick={() => p.state.openEvent(row.event.id)}
                class="flex cursor-pointer flex-col gap-3 p-4 transition-colors hover:bg-surface-muted sm:flex-row sm:items-center sm:gap-4"
              >
                <Show
                  when={row.event.imageUrl}
                  fallback={<span class="h-10 w-16 shrink-0 rounded-lg bg-surface-muted" aria-hidden="true" />}
                >
                  <img
                    src={row.event.imageUrl}
                    alt=""
                    loading="lazy"
                    class="h-10 w-16 shrink-0 rounded-lg object-cover"
                  />
                </Show>
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm font-semibold text-content">{row.event.title}</p>
                  <p class="mt-0.5 flex items-center gap-1 text-sm text-content-muted">
                    <Icon path={mdiMapMarkerOutline} class="size-4 shrink-0" />
                    <span class="truncate">
                      {row.event.venue.name} · {row.event.venue.city}
                    </span>
                  </p>
                  <p class="mt-0.5 flex items-center gap-1 text-sm text-content-muted">
                    <Icon path={mdiCalendarOutline} class="size-4 shrink-0" />
                    {dashDateFormat(row.event.startsAt, "wochentag-datum")} ·{" "}
                    {dashDateFormat(row.event.startsAt, "zeit")}
                  </p>
                </div>
                <DashStatusPill kind="event" value={p.state.phaseOf(row.event)} />
                <div class="w-full sm:w-44 sm:shrink-0">
                  <ProgressBar
                    value={row.stats.sold}
                    max={row.stats.capacity}
                    size="sm"
                    label={`Verkaufte Tickets für ${row.event.title}`}
                  />
                  <p class="mt-1 text-xs tabular-nums text-content-muted">
                    {row.stats.sold} / {row.stats.capacity}
                  </p>
                </div>
                <Show when={p.state.canSeeRevenue()}>
                  <p class="text-sm font-semibold tabular-nums text-content sm:w-28 sm:shrink-0 sm:text-right">
                    {dashCentsFormat(row.stats.revenueCents)}
                  </p>
                </Show>
                <span onClick={(event) => event.stopPropagation()} class="sm:shrink-0">
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
    </div>
  )
}
