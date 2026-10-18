import { For } from "solid-js"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashCheckinPageState } from "../dashCheckinPageStateCreate.ts"

/** Einlass nach Ticketart: Fortschritt je Ticketart mit Zähler. */
export function DashCheckinByTicketType(p: { state: DashCheckinPageState }) {
  return (
    <DashSection title="Nach Ticketart" description="Eingecheckt im Verhältnis zu gültigen Tickets je Ticketart.">
      <div class="flex flex-col gap-4">
        <For each={p.state.stats().byTicketType}>
          {(row) => (
            <div class="flex flex-col gap-1.5">
              <div class="flex items-baseline justify-between gap-2">
                <p class="min-w-0 truncate text-sm font-medium text-content">{row.name}</p>
                <p class="shrink-0 text-sm text-content-muted tabular-nums">
                  {row.checkedIn} / {row.valid}
                </p>
              </div>
              <ProgressBar value={row.checkedIn} max={Math.max(1, row.valid)} label={row.name} />
            </div>
          )}
        </For>
      </div>
    </DashSection>
  )
}
