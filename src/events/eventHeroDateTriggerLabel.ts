const formatter = new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "short" })

export function eventHeroDateTriggerLabel(isoDate: string): string {
  const parsed = new Date(isoDate)
  if (Number.isNaN(parsed.getTime())) return "Datum wählen"

  return formatter.format(parsed)
}
