const formatter = new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit" })

export function eventTimeFormat(isoDate: string): string {
  return `${formatter.format(new Date(isoDate))} Uhr`
}
