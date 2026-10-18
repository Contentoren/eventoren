import { mdiFilterOutline } from "@adaptive-ds/mdi/mdiFilterOutline.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { For } from "solid-js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import type { DashAttendeeCheckinFilter, DashAttendeeKanalFilter } from "../model/dashAttendeeSearchParse.ts"

export interface DashAttendeesToolbarProps {
  q: string
  onQ: (value: string) => void
  checkin: DashAttendeeCheckinFilter
  onCheckin: (value: DashAttendeeCheckinFilter) => void
  counts: Record<DashAttendeeCheckinFilter, number>
  kanal: DashAttendeeKanalFilter
  onKanal: (value: DashAttendeeKanalFilter) => void
  ticketTypes: DashTicketType[]
  ticketart: string
  onTicketart: (value: string) => void
}

const checkinChips: { value: DashAttendeeCheckinFilter; label: string }[] = [
  { value: "alle", label: "Alle" },
  { value: "eingecheckt", label: "Eingecheckt" },
  { value: "offen", label: "Offen" },
]

const kanalOptions: { value: DashAttendeeKanalFilter; label: string }[] = [
  { value: "alle", label: "Alle Kanäle" },
  { value: "online", label: "Online" },
  { value: "abendkasse", label: "Abendkasse" },
  { value: "gaesteliste", label: "Gästeliste" },
]

function kanalLabel(kanal: DashAttendeeKanalFilter): string {
  return kanalOptions.find((option) => option.value === kanal)?.label ?? "Alle Kanäle"
}

/** Suchfeld, Ticketart-Menü, Check-in-Chips und Kanal-Menü für die Teilnehmerliste. */
export function DashAttendeesToolbar(p: DashAttendeesToolbarProps) {
  const ticketartLabel = () => {
    if (p.ticketart === "") return "Alle Ticketarten"
    return p.ticketTypes.find((type) => type.id === p.ticketart)?.name ?? "Alle Ticketarten"
  }

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-52 flex-1 sm:max-w-xs">
          <span class="sr-only">Teilnehmer suchen</span>
          <Icon
            path={mdiMagnify}
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
          />
          <Input
            type="search"
            value={p.q}
            onInput={(event) => p.onQ(event.currentTarget.value)}
            placeholder="Name, E-Mail, Code …"
            aria-label="Teilnehmer suchen"
            class="h-9 pl-9 text-sm rounded-control"
          />
        </label>
        <DropdownMenu
          items={[
            { type: "item" as const, id: "alle", label: "Alle Ticketarten", onSelect: () => p.onTicketart("") },
            ...p.ticketTypes.map((type) => ({
              type: "item" as const,
              id: type.id,
              label: type.name,
              onSelect: () => p.onTicketart(type.id),
            })),
          ]}
          triggerLabel={ticketartLabel()}
          triggerIcon={mdiFilterOutline}
          triggerAriaLabel="Ticketart filtern"
        />
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
      </div>
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Check-in filtern">
        <For each={checkinChips}>
          {(chip) => (
            <FilterChip
              active={p.checkin === chip.value}
              onClick={() => p.onCheckin(chip.value)}
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
