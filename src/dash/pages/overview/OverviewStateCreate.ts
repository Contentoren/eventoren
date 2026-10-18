import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type OverviewZeitraum = 7 | 30 | 365

export type OverviewState = {
  zeitraum: () => OverviewZeitraum
  setZeitraum: (v: OverviewZeitraum) => void
  salesMetric: () => "umsatz" | "tickets"
  setSalesMetric: (v: "umsatz" | "tickets") => void
}

export function OverviewStateCreate(initial: OverviewZeitraum): OverviewState {
  const zeitraumSignal = createSignalObject<OverviewZeitraum>(initial)
  const salesMetricSignal = createSignalObject<"umsatz" | "tickets">("umsatz")
  return {
    zeitraum: zeitraumSignal.get,
    setZeitraum: zeitraumSignal.set,
    salesMetric: salesMetricSignal.get,
    setSalesMetric: salesMetricSignal.set,
  }
}
