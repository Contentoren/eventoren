export type OrganizerDashboardMessageIcsInput = {
  readonly uid: string
  readonly title: string
  readonly description?: string
  readonly location?: string
  readonly startsAt: string
  readonly endsAt: string
  readonly url?: string
}

function organizerDashboardMessageIcsDateFormat(iso: string): string {
  const date = new Date(iso)
  const pad = (value: number): string => String(value).padStart(2, "0")
  return (
    `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(date.getUTCDate())}` +
    `T${pad(date.getUTCHours())}${pad(date.getUTCMinutes())}${pad(date.getUTCSeconds())}Z`
  )
}

function organizerDashboardMessageIcsTextEscape(text: string): string {
  return text
    .replaceAll("\\", "\\\\")
    .replaceAll("\r\n", "\n")
    .replaceAll("\r", "\n")
    .replaceAll("\n", "\\n")
    .replaceAll(";", "\\;")
    .replaceAll(",", "\\,")
}

function organizerDashboardMessageIcsByteLength(char: string): number {
  const code = char.codePointAt(0) ?? 0
  if (code <= 0x7f) return 1
  if (code <= 0x7ff) return 2
  if (code <= 0xffff) return 3
  return 4
}

function organizerDashboardMessageIcsLineFold(line: string): string {
  const chunks: string[] = []
  let current = ""
  let currentBytes = 0
  for (const char of line) {
    const limit = chunks.length === 0 ? 75 : 74
    if (current !== "" && currentBytes + organizerDashboardMessageIcsByteLength(char) > limit) {
      chunks.push(current)
      current = ""
      currentBytes = 0
    }
    current += char
    currentBytes += organizerDashboardMessageIcsByteLength(char)
  }
  chunks.push(current)
  return chunks.join("\r\n ")
}

/**
 * Builds a calendar entry (.ics) for the 24h reminder. All instants are
 * stored and rendered as UTC; the mail body shows Europe/Berlin times.
 */
export function organizerDashboardMessageIcsCreate(input: OrganizerDashboardMessageIcsInput): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Eventoren//Veranstalter//DE",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    `UID:${input.uid}`,
    `DTSTAMP:${organizerDashboardMessageIcsDateFormat(new Date().toISOString())}`,
    `DTSTART:${organizerDashboardMessageIcsDateFormat(input.startsAt)}`,
    `DTEND:${organizerDashboardMessageIcsDateFormat(input.endsAt)}`,
    `SUMMARY:${organizerDashboardMessageIcsTextEscape(input.title)}`,
  ]
  if (input.description !== undefined)
    lines.push(`DESCRIPTION:${organizerDashboardMessageIcsTextEscape(input.description)}`)
  if (input.location !== undefined) lines.push(`LOCATION:${organizerDashboardMessageIcsTextEscape(input.location)}`)
  if (input.url !== undefined) lines.push(`URL:${input.url}`)
  lines.push("END:VEVENT", "END:VCALENDAR")
  return `${lines.map(organizerDashboardMessageIcsLineFold).join("\r\n")}\r\n`
}
