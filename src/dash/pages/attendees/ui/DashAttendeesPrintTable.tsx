import { For } from "solid-js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashAttendeeListRow } from "../model/dashAttendeeListFilter.ts"

export interface DashAttendeesPrintTableProps {
  eventTitle: string
  eventDate: string
  rows: DashAttendeeListRow[]
}

/** Kompakte Einlassliste nur für den Druck: Name · Ticketart · Code · ☐. */
export function DashAttendeesPrintTable(p: DashAttendeesPrintTableProps) {
  return (
    <div class="hidden print:block">
      <h1 class="text-xl font-bold">Einlassliste – {p.eventTitle}</h1>
      <p class="mt-1 text-sm">
        {dashDateFormat(p.eventDate, "datum")} · Stand {dashDateFormat(new Date().toISOString(), "kurz")}
      </p>
      <table class="mt-4 w-full border-collapse text-sm">
        <thead>
          <tr class="border-b-2 border-black">
            <th class="py-1 pr-4 text-left font-semibold">Name</th>
            <th class="py-1 pr-4 text-left font-semibold">Ticketart</th>
            <th class="py-1 pr-4 text-left font-semibold">Code</th>
            <th class="w-10 py-1 text-left font-semibold">☐</th>
          </tr>
        </thead>
        <tbody>
          <For each={p.rows}>
            {(row) => (
              <tr class="border-b border-black/20">
                <td class="py-1 pr-4">{row.ticket.holderName}</td>
                <td class="py-1 pr-4">{row.ticketTypeName}</td>
                <td class="py-1 pr-4 font-mono text-[13px]">{row.ticket.code}</td>
                <td class="py-1">☐</td>
              </tr>
            )}
          </For>
        </tbody>
      </table>
    </div>
  )
}
