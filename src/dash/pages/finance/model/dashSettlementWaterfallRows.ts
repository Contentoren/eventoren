export type DashSettlementWaterfallRow = {
  id: "brutto" | "erstattung" | "rueckbuchung" | "plattform" | "zahlung" | "auszahlung"
  label: string
  cents: number
  negativ: boolean
  final: boolean
}

export type DashSettlementWaterfallInput = {
  ticketRevenueCents: number
  refundsCents: number
  chargebacksCents: number
  platformFeeCents: number
  paymentCostsCents: number
  payoutCents: number
}

/** Wasserfall-Zeilen der Abrechnung: brutto minus Abzüge gleich Auszahlung. */
export function dashSettlementWaterfallRows(input: DashSettlementWaterfallInput): DashSettlementWaterfallRow[] {
  const rows: DashSettlementWaterfallRow[] = [
    { id: "brutto", label: "Ticketumsatz brutto", cents: input.ticketRevenueCents, negativ: false, final: false },
  ]
  if (input.refundsCents > 0) {
    rows.push({ id: "erstattung", label: "Erstattungen", cents: input.refundsCents, negativ: true, final: false })
  }
  if (input.chargebacksCents > 0) {
    rows.push({
      id: "rueckbuchung",
      label: "Rückbuchungen (inkl. Gebühr)",
      cents: input.chargebacksCents,
      negativ: true,
      final: false,
    })
  }
  if (input.platformFeeCents > 0) {
    rows.push({
      id: "plattform",
      label: "Plattformgebühr",
      cents: input.platformFeeCents,
      negativ: true,
      final: false,
    })
  }
  if (input.paymentCostsCents > 0) {
    rows.push({ id: "zahlung", label: "Zahlungskosten", cents: input.paymentCostsCents, negativ: true, final: false })
  }
  rows.push({ id: "auszahlung", label: "Auszahlung", cents: input.payoutCents, negativ: false, final: true })
  return rows
}
