import { Show } from "solid-js"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import type { DashCheckinPageState } from "../dashCheckinPageStateCreate.ts"
import { DashCheckinHeader } from "./DashCheckinHeader.tsx"
import { DashCheckinOverview } from "./DashCheckinOverview.tsx"
import { DashCheckinByTicketType } from "./DashCheckinByTicketType.tsx"
import { DashCheckinByEntrance } from "./DashCheckinByEntrance.tsx"
import { DashCheckinLog } from "./DashCheckinLog.tsx"
import { DashCheckinManual } from "./DashCheckinManual.tsx"
import { DashCheckinLinks } from "./DashCheckinLinks.tsx"

/** Seite „Live-Einlass": Übersicht, Aufschlüsselungen, Protokoll, Check-in und Scanner-Links. */
export function DashCheckinPage(p: { eventId: string; state: DashCheckinPageState }) {
  return (
    <Show
      when={p.state.can()}
      fallback={<DashLockedState description="Den Einlass nutzen nur Rollen mit Zugriff auf den Einlass." />}
    >
      <div class="flex flex-col gap-4 sm:gap-5">
        <DashCheckinHeader state={p.state} />
        <DashCheckinOverview state={p.state} />
        <DashCheckinByTicketType state={p.state} />
        <DashCheckinByEntrance state={p.state} />
        <DashCheckinLog state={p.state} />
        <div class="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2">
          <DashCheckinManual eventId={p.eventId} />
          <DashCheckinLinks eventId={p.eventId} />
        </div>
      </div>
    </Show>
  )
}
