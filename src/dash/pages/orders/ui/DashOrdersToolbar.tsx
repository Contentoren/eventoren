import { mdiFilterOutline } from "@adaptive-ds/mdi/mdiFilterOutline.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { For, Show } from "solid-js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashOrdersChannelFilter, DashOrdersStatusFilter } from "../model/dashOrderListFilter.ts"

export interface DashOrdersToolbarProps {
  q: string
  onQ: (value: string) => void
  status: DashOrdersStatusFilter
  onStatus: (value: DashOrdersStatusFilter) => void
  counts: Record<DashOrdersStatusFilter, number>
  kanal: DashOrdersChannelFilter
  onKanal: (value: DashOrdersChannelFilter) => void
  showEventFilter: boolean
  events: DashEvent[]
  eventId: string | null
  onEvent: (value: string | null) => void
}

const statusChips: { value: DashOrdersStatusFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "bezahlt", label: "Bezahlt" },
  { value: "offen", label: "Offen" },
  { value: "storniert", label: "Storniert" },
  { value: "erstattet", label: "Erstattet" },
]

const kanalOptions: { value: DashOrdersChannelFilter; label: string }[] = [
  { value: "alle", label: "Alle Kanäle" },
  { value: "online", label: "Online" },
  { value: "abendkasse", label: "Abendkasse" },
  { value: "gaesteliste", label: "Gästeliste" },
]

function kanalLabel(kanal: DashOrdersChannelFilter): string {
  return kanalOptions.find((option) => option.value === kanal)?.label ?? "Alle Kanäle"
}

/** Suchfeld, Status-Chips, Kanal- und Event-Filter für die Bestellliste. */
export function DashOrdersToolbar(p: DashOrdersToolbarProps) {
  const eventLabel = () => {
    if (p.eventId === null) return "Alle Events"
    return p.events.find((event) => event.id === p.eventId)?.title ?? "Alle Events"
  }

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-52 flex-1 sm:max-w-xs">
          <span class="sr-only">Bestellungen suchen</span>
          <Icon
            path={mdiMagnify}
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
          />
          <Input
            type="search"
            value={p.q}
            onInput={(event) => p.onQ(event.currentTarget.value)}
            placeholder="Nummer, Name, E-Mail …"
            aria-label="Bestellungen suchen"
            class="h-9 pl-9 text-sm rounded-control"
          />
        </label>
        <DropdownMenu
          items={kanalOptions.map((option) => ({
            type: "item" as const,
            id: option.value,
            label: option.label,
            onSelect: () => p.onKanal(option.value),
          }))}
          triggerLabel={kanalLabel(p.kanal)}
          triggerIcon={mdiFilterOutline}
          triggerAriaLabel="Kanal filtern"
        />
        <Show when={p.showEventFilter}>
          <DropdownMenu
            items={[
              { type: "item" as const, id: "alle", label: "Alle Events", onSelect: () => p.onEvent(null) },
              ...p.events.map((event) => ({
                type: "item" as const,
                id: event.id,
                label: event.title,
                onSelect: () => p.onEvent(event.id),
              })),
            ]}
            triggerLabel={eventLabel()}
            triggerIcon={mdiFilterOutline}
            triggerAriaLabel="Event filtern"
          />
        </Show>
      </div>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Status filtern">
        <For each={statusChips}>
          {(chip) => (
            <FilterChip
              active={p.status === chip.value}
              onClick={() => p.onStatus(chip.value)}
              count={p.counts[chip.value]}
            >
              {chip.label}
            </FilterChip>
          )}
        </For>
      </div>
    </div>
  )
}
