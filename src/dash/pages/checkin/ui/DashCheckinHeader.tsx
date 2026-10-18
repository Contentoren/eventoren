import { DotPill } from "#ui/static/pill/DotPill.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import type { DashCheckinPageState } from "../dashCheckinPageStateCreate.ts"

function checkinLiveLabelCreate(phase: "vor" | "live" | "nach"): string {
  if (phase === "live") return "Live"
  if (phase === "vor") return "Noch nicht gestartet"
  return "Beendet"
}

/** Kopfzeile Live-Einlass: Titel, Live-Pill, Simulation-Schalter und Scanner-Link. */
export function DashCheckinHeader(p: { state: DashCheckinPageState }) {
  return (
    <DashPageHeader
      title="Live-Einlass"
      description="Check-ins, Scanner und Statistik."
      meta={
        <DotPill tone={p.state.phase() === "live" ? "success" : "neutral"} pulse={p.state.phase() === "live"} size="md">
          {checkinLiveLabelCreate(p.state.phase())}
        </DotPill>
      }
      actions={
        <div class="flex items-center gap-3">
          <ToggleSwitch
            checked={p.state.simOn.get()}
            onChange={(checked) => p.state.toggleSim(checked)}
            label="Simulation"
          />
          <LinkButtonInternal
            to="/demo/admin/organizer/event/xyz"
            newTab
            variant="outline"
            size="sm"
            class="h-9 px-3 text-sm"
            icon={mdiQrcodeScan}
          >
            Scanner öffnen
          </LinkButtonInternal>
        </div>
      }
    />
  )
}
