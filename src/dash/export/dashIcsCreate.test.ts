import { expect, test } from "bun:test"
import { dashIcsCreate } from "./dashIcsCreate.ts"

const input = {
  uid: "indie-night@eventoren.de",
  title: "Indie Night: Lichtspiel",
  description: "Einlass ab 19:30, Beginn 20:00",
  location: "Lindenhof, Hauptstraße 1; 69117 Heidelberg",
  startsAt: "2026-10-18T18:00:00.000Z",
  endsAt: "2026-10-18T22:00:00.000Z",
  url: "https://eventoren.de/demo/indie-night",
}

test("erzeugt ein gültiges VCALENDAR-Grundgerüst mit UTC-Zeiten", () => {
  const ics = dashIcsCreate(input)
  expect(ics.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true)
  expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true)
  expect(ics).toContain("PRODID:-//Eventoren//Demo//DE")
  expect(ics).toContain("DTSTART:20261018T180000Z")
  expect(ics).toContain("DTEND:20261018T220000Z")
  expect(ics).toMatch(/DTSTAMP:\d{8}T\d{6}Z/)
})

test("maskiert Sonderzeichen in Texten", () => {
  const ics = dashIcsCreate({ ...input, title: "Jazz, Wein; Back\\Slash", description: "Zeile1\nZeile2" })
  expect(ics).toContain("SUMMARY:Jazz\\, Wein\\; Back\\\\Slash")
  expect(ics).toContain("DESCRIPTION:Zeile1\\nZeile2")
  expect(ics).toContain("LOCATION:Lindenhof\\, Hauptstraße 1\\; 69117 Heidelberg")
})

test("faltet lange Zeilen bei 75 Oktetten (UTF-8-bewusst)", () => {
  const long = `ö${"a".repeat(100)}`
  const ics = dashIcsCreate({ ...input, title: long })
  const lines = ics.split("\r\n")
  const encoder = new TextEncoder()
  for (const line of lines) {
    const bytes = encoder.encode(line.startsWith(" ") ? line.slice(1) : line).length
    expect(bytes).toBeLessThanOrEqual(75)
  }
  const unfolded = ics.replaceAll("\r\n ", "")
  expect(unfolded).toContain(`SUMMARY:${long}`)
})

test("optionale Felder entfallen ohne Platzhalter", () => {
  const ics = dashIcsCreate({ uid: "x", title: "T", startsAt: input.startsAt, endsAt: input.endsAt })
  expect(ics).not.toContain("DESCRIPTION")
  expect(ics).not.toContain("LOCATION")
  expect(ics).not.toContain("URL:")
})
