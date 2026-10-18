import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { OverviewStateCreate } from "../OverviewStateCreate.ts"
import { AreaChart } from "#ui/chart/AreaChart.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"

const axisIntegerFormat = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 })

const axisTsdFormat = new Intl.NumberFormat("de-DE", { minimumFractionDigits: 0, maximumFractionDigits: 1 })

function dashOverviewAxisEuro(value: number): string {
  const normalized = Number.isFinite(value) ? value : 0
  const absolute = Math.abs(normalized)
  if (absolute > 1000) {
    return `${axisTsdFormat.format(normalized / 1000)} Tsd. €`
  }
  return `${axisIntegerFormat.format(normalized)} €`
}

function dashOverviewAxisTickets(value: number): string {
  const normalized = Number.isFinite(value) ? Math.round(value) : 0
  return axisIntegerFormat.format(normalized)
}

export function DashOverviewSalesChart(p: {
  state: ReturnType<typeof OverviewStateCreate>
  series: { key: string; label: string; revenueCents: number; tickets: number }[]
  previousRevenue: number[]
}) {
  const points = () =>
    p.state.salesMetric() === "umsatz"
      ? p.series.map((point) => ({ label: point.label, value: point.revenueCents / 100 }))
      : p.series.map((point) => ({ label: point.label, value: point.tickets }))
  const compare = () => (p.state.salesMetric() === "umsatz" ? p.previousRevenue.map((value) => value / 100) : null)
  const axisFormat = () => (p.state.salesMetric() === "umsatz" ? dashOverviewAxisEuro : dashOverviewAxisTickets)
  const valueFormat = () =>
    p.state.salesMetric() === "umsatz"
      ? (value: number) => dashCentsFormat(Math.round(value * 100))
      : (value: number) => `${axisIntegerFormat.format(Math.round(value))}`
  return (
    <DashSection
      title="Verkaufskurve"
      actions={
        <SegmentedControl
          value={p.state.salesMetric()}
          onChange={(value) => p.state.setSalesMetric(value === "tickets" ? "tickets" : "umsatz")}
          options={[
            { value: "umsatz", label: "Umsatz" },
            { value: "tickets", label: "Tickets" },
          ]}
          ariaLabel="Kennzahl wählen"
          size="sm"
        />
      }
    >
      <AreaChart
        points={points()}
        compare={compare() ?? undefined}
        height={220}
        valueFormat={valueFormat()}
        axisFormat={axisFormat()}
        ariaLabel={p.state.salesMetric() === "umsatz" ? "Umsatz pro Tag" : "Tickets pro Tag"}
      />
    </DashSection>
  )
}
