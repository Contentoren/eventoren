import { Show } from "solid-js"
import { dashCan } from "../../../store/dashCan.ts"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { DashSettlementView } from "./DashSettlementView.tsx"

/** Abrechnungsseite des Veranstalters: prüft die Finanzen-Berechtigung, bevor die Settlement-Ansicht rendert. */
export function DashSettlementPage(p: { eventId: string }) {
  const canSee = () => dashCan("finanzen.sehen")
  return (
    <Show when={canSee()} fallback={<DashLockedState description="Nur für Finanzen und Inhaber." />}>
      <DashSettlementView eventId={p.eventId} />
    </Show>
  )
}
