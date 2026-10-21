export type OrganizerDashboardExportEvent = {
  readonly uid: string
  readonly title: string
  readonly description: string
  readonly location: string
  readonly startsAt: string
  readonly endsAt: string
  readonly url: string
  readonly attendees: readonly string[]
}

function icsDateFormat(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number): string => String(value).padStart(2, "0")
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

function icsTextEscape(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
}

function icsLineFold(line: string): string {
  const chunks: string[] = []
  let current = ""
  let currentBytes = 0
  const byteLength = (char: string): number => {
    const code = char.codePointAt(0) ?? 0
    if (code <= 0x7f) return 1
    if (code <= 0x7ff) return 2
    if (code <= 0xffff) return 3
    return 4
  }
  for (const char of line) {
    const limit = chunks.length === 0 ? 75 : 74
    if (current !== "" && currentBytes + byteLength(char) > limit) {
      chunks.push(current)
      current = ""
      currentBytes = 0
    }
    current += char
    currentBytes += byteLength(char)
  }
  chunks.push(current)
  return chunks.join("\r\n ")
}

/**
 * Calendar export for one event. Instants stay UTC (storage), the attendee
 * list carries the permission-filtered export rows (teilnehmer). No new
 * packages: plain RFC 5545 text with line folding.
 */
export function organizerDashboardExportIcsCreate(event: OrganizerDashboardExportEvent): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventoren//Veranstalter//DE",
    "BEGIN:VEVENT",
    `UID:${icsTextEscape(event.uid)}`,
    `DTSTAMP:${icsDateFormat(new Date().toISOString())}`,
    `DTSTART:${icsDateFormat(event.startsAt)}`,
    `DTEND:${icsDateFormat(event.endsAt)}`,
    `SUMMARY:${icsTextEscape(event.title)}`,
    `DESCRIPTION:${icsTextEscape(event.description)}`,
    `LOCATION:${icsTextEscape(event.location)}`,
    `URL:${icsTextEscape(event.url)}`,
    ...event.attendees.map((attendee) => `ATTENDEE;CN=${icsTextEscape(attendee)}:mailto:${icsTextEscape(attendee)}`),
    "END:VEVENT",
    "END:VCALENDAR",
  ]
  return `${lines.map(icsLineFold).join("\r\n")}\r\n`
}
