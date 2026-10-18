import { ProgressRing } from "#ui/static/progress/ProgressRing.jsx"
import { BarChart } from "#ui/chart/BarChart.jsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import type { DashCheckinPageState } from "../dashCheckinPageStateCreate.ts"

/** Übersichtskarte: Ring mit Zähler, 15-Min-Schnitt und Stunden-Chart. */
export function DashCheckinOverview(p: { state: DashCheckinPageState }) {
  return (
    <DashSection title="Übersicht" description="Eingecheckt im Verhältnis zu gültigen Tickets.">
      <div class="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div class="flex flex-col items-center justify-center gap-2 py-2">
          <ProgressRing value={p.state.stats().checkedIn} max={Math.max(1, p.state.stats().valid)} size={140}>
            <span class="text-center">
              <span class="block text-xl font-semibold text-content tabular-nums">
                {p.state.stats().checkedIn} / {p.state.stats().valid}
              </span>
              <span class="block text-sm text-content-muted tabular-nums">{p.state.stats().percent} %</span>
            </span>
          </ProgressRing>
        </div>
        <div class="flex flex-col gap-1 lg:justify-center">
          <p class="text-sm font-medium text-content">Letzte 15 Min.</p>
          <p class="text-2xl font-semibold text-content tabular-nums">+{p.state.stats().last15}</p>
        </div>
        <div class="min-w-0">
          <p class="mb-2 text-sm font-medium text-content">Einlass pro Viertelstunde</p>
          <BarChart
            bars={p.state.stats().quarters.map((quarter) => ({
              label: quarter.label,
              value: quarter.count,
              highlight: quarter.current,
            }))}
            height={160}
            valueFormat={(value) => `${value}`}
            ariaLabel="Eingecheckte Tickets pro Viertelstunde"
          />
        </div>
      </div>
    </DashSection>
  )
}
