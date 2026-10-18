import { For } from "solid-js"
import { DashAccountTicketCard } from "./DashAccountTicketCard.tsx"
import type { DashAccountTicketRow } from "../model/dashAccountTicketRow.ts"

export function DashAccountTicketList(p: {
  rows: DashAccountTicketRow[]
  compact?: boolean
  onOpen: (ticketId: string) => void
}) {
  return (
    <div class="flex flex-col gap-4">
      <For each={p.rows}>{(row) => <DashAccountTicketCard row={row} compact={p.compact} onOpen={p.onOpen} />}</For>
    </div>
  )
}
