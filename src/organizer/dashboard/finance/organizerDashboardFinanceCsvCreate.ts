export type OrganizerDashboardFinanceCsvRow = {
  readonly eventKey: string
  readonly eventTitle: string
  readonly paidOrders: number
  readonly tickets: number
  readonly grossCents: number
  readonly feeCents: number
  readonly disputeCents: number
  readonly payoutCents: number
}

function organizerDashboardFinanceCsvCell(value: string | number): string {
  const text = String(value)
  return /[";\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

/**
 * Filtered settlement export as semicolon-separated CSV (opens correctly in
 * German Excel). Pure function: callers pass the already filtered rows, so
 * HTTP/CLI/TS-client surfaces share the exact same bytes.
 */
export function organizerDashboardFinanceCsvCreate(rows: readonly OrganizerDashboardFinanceCsvRow[]): string {
  const header = [
    "Event-Key",
    "Titel",
    "Bestellungen",
    "Tickets",
    "Brutto (€)",
    "Gebühren (€)",
    "Streitfälle (€)",
    "Auszahlung (€)",
  ]
  const lines = [header.map(organizerDashboardFinanceCsvCell).join(";")]
  for (const row of rows) {
    lines.push(
      [
        organizerDashboardFinanceCsvCell(row.eventKey),
        organizerDashboardFinanceCsvCell(row.eventTitle),
        organizerDashboardFinanceCsvCell(row.paidOrders),
        organizerDashboardFinanceCsvCell(row.tickets),
        organizerDashboardFinanceCsvCell((row.grossCents / 100).toFixed(2)),
        organizerDashboardFinanceCsvCell((row.feeCents / 100).toFixed(2)),
        organizerDashboardFinanceCsvCell((row.disputeCents / 100).toFixed(2)),
        organizerDashboardFinanceCsvCell((row.payoutCents / 100).toFixed(2)),
      ].join(";"),
    )
  }
  return lines.join("\r\n") + "\r\n"
}
