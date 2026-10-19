/** Dateiname für den Admin-Bestell-Export, z. B. bestellungen-2026-10-19.csv (Europe/Berlin). */
export function adminTicketOrdersExportFilename(now = new Date()): string {
  const day = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  return `bestellungen-${day}.csv`
}
