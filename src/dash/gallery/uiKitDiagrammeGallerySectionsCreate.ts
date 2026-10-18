const euroCents = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

const euroCompact = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
  notation: "compact",
  maximumFractionDigits: 1,
})

const integer = new Intl.NumberFormat("de-DE", { maximumFractionDigits: 0 })

export function uiKitDiagrammeEuroFormat(cents: number): string {
  return euroCents.format(cents / 100)
}

export function uiKitDiagrammeAxisFormat(cents: number): string {
  return euroCompact.format(cents / 100)
}

export function uiKitDiagrammeCountFormat(count: number): string {
  return `${integer.format(count)} Tickets`
}

/** Deterministic pseudo-random sequence (mulberry32 with fixed seed). */
export function uiKitDiagrammeSeeded(index: number, salt: number): number {
  let state = (index * 2_654_435_761 + salt * 97_531) >>> 0
  state = (state + 0x6d_2b_79_f5) >>> 0
  let mixed = state
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1)
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 4_294_96_7296
}

const dayMs = 86_400_000
const baseTime = new Date("2026-09-18T12:00:00+02:00").getTime()

const dayLabelFormat = new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" })

export function uiKitDiagrammeRevenue30() {
  return Array.from({ length: 30 }, (_, index) => {
    const time = baseTime - (29 - index) * dayMs
    const wave = 3_200 + 2_400 * Math.sin(index / 4.2) + 1_800 * Math.sin(index / 2.3 + 1)
    const noise = (uiKitDiagrammeSeeded(index, 11) - 0.5) * 1_600
    const weekend = [5, 6, 12, 13, 19, 20, 26, 27].includes(index) ? 2_200 : 0
    const value = Math.max(400, Math.round((wave + noise + weekend) * 100) / 100)
    const compareValue = Math.max(300, Math.round(value * (0.72 + uiKitDiagrammeSeeded(index, 29) * 0.2) * 100) / 100)
    return { label: dayLabelFormat.format(new Date(time)), value: Math.round(value), compare: Math.round(compareValue) }
  })
}

export function uiKitDiagrammeRevenue7() {
  const week = ["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"]
  return week.map((label, index) => {
    const value = Math.round(2_800 + 1_900 * Math.sin(index / 1.6) + uiKitDiagrammeSeeded(index, 77) * 1_200)
    return { label, value: Math.max(900, value) }
  })
}

export function uiKitDiagrammeCheckins() {
  return Array.from({ length: 16 }, (_, index) => {
    const hour = 19 + Math.floor(index / 4)
    const minute = [0, 15, 30, 45][index % 4]!
    const peak = index >= 4 && index <= 10 ? 1 : 0.45
    const value = Math.round((14 + uiKitDiagrammeSeeded(index, 5) * 22) * peak + (index === 15 ? 0 : 2))
    return {
      label: `${hour}:${String(minute).padStart(2, "0")}`,
      value: Math.max(1, value),
      highlight: index === 15,
    }
  })
}

export function uiKitDiagrammeDonut() {
  return [
    { label: "Online", value: 312, tone: "brand" as const },
    { label: "Abendkasse", value: 78, tone: "neutral" as const },
    { label: "Gästeliste", value: 41, tone: "success" as const },
  ]
}

export function uiKitDiagrammeSpark30() {
  return Array.from(
    { length: 30 },
    (_, index) => 2_400 + 1_600 * Math.sin(index / 4.2) + uiKitDiagrammeSeeded(index, 11) * 900,
  )
}

export function uiKitDiagrammeSparkTickets() {
  return Array.from(
    { length: 30 },
    (_, index) => 18 + 12 * Math.sin(index / 3.4 + 0.6) + uiKitDiagrammeSeeded(index, 41) * 9,
  )
}

export function uiKitDiagrammeSparkOrders() {
  return Array.from(
    { length: 30 },
    (_, index) => 9 + 6 * Math.sin(index / 3.9 + 1.4) + uiKitDiagrammeSeeded(index, 53) * 5,
  )
}

export function uiKitDiagrammeSparkAverage() {
  return Array.from(
    { length: 30 },
    (_, index) => 42 + 5 * Math.sin(index / 5.1 + 2.2) + uiKitDiagrammeSeeded(index, 67) * 4,
  )
}
