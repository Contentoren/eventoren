import { describe, expect, test } from "bun:test"
import {
  organizerDashboardExportCsvCreate,
  organizerDashboardExportHeaderGet,
  organizerDashboardExportRowsCreate,
  organizerDashboardExportXlsxCreate,
} from "./organizerDashboardExportRowsCreate.ts"
import { organizerDashboardExportIcsCreate } from "./organizerDashboardExportIcsCreate.ts"
import { organizerDashboardExportCursorCreate } from "./organizerDashboardExportCursorCreate.ts"
import { organizerDashboardExportCursorParse } from "./organizerDashboardExportCursorParse.ts"

describe("organizerDashboardExportRowsCreate", () => {
  test("headers per kind", () => {
    expect(organizerDashboardExportHeaderGet("teilnehmer")).toEqual([
      "Name",
      "E-Mail",
      "Ticketart",
      "Code",
      "Status",
      "Eingecheckt",
    ])
    expect(organizerDashboardExportHeaderGet("bestellungen")[0]).toBe("Bestellnummer")
    expect(organizerDashboardExportHeaderGet("checkins")[0]).toBe("Ticketcode")
  })

  test("teilnehmer rows render Berlin time and status", () => {
    const rows = organizerDashboardExportRowsCreate("teilnehmer", [
      {
        name: "Lea Schneider",
        email: "lea.schneider@example.de",
        tierName: "Stehplatz",
        code: "T-AB12-CD34",
        cancelled: false,
        checkedInAt: "2026-10-21T18:30:00.000Z",
      },
      {
        name: "Max Frei",
        email: "max@example.de",
        tierName: "Stehplatz",
        code: "T-FF00-FF00",
        cancelled: true,
        checkedInAt: undefined,
      },
    ])
    expect(rows[0]?.[4]).toBe("eingecheckt")
    expect(rows[0]?.[5]).toBe("21.10.2026, 20:30")
    expect(rows[1]).toEqual(["Max Frei", "max@example.de", "Stehplatz", "T-FF00-FF00", "storniert", ""])
  })

  test("bestellungen rows render Euro and Berlin day", () => {
    const rows = organizerDashboardExportRowsCreate("bestellungen", [
      {
        bookingNumber: "EV-260123",
        buyerName: "Lea Schneider",
        buyerEmail: "lea.schneider@example.de",
        status: "paid",
        totalCents: 4550,
        createdAt: "2026-10-20T22:15:00.000Z",
      },
    ])
    expect(rows[0]?.[4]).toBe("45,50 €")
    expect(rows[0]?.[5]).toBe("21.10.2026")
  })

  test("csv guards formulas and uses semicolons", () => {
    const csv = organizerDashboardExportCsvCreate("checkins", [
      ["T-1", "=cmd", "check_in", "21.10.2026, 20:30", "Haupteingang", "Team"],
    ])
    expect(csv.startsWith("﻿")).toBe(true)
    expect(csv).toContain("Ticketcode;Teilnehmer;Aktion")
    expect(csv).toContain("'=cmd")
  })

  test("xlsx starts with the zip magic", () => {
    const xlsx = organizerDashboardExportXlsxCreate("Teilnehmer", "teilnehmer", [
      ["Lea", "l@example.de", "S", "T", "x", ""],
    ])
    expect(xlsx[0]).toBe(0x50)
    expect(xlsx[1]).toBe(0x4b)
    expect(xlsx.length).toBeGreaterThan(1000)
  })
})

describe("organizerDashboardExportIcsCreate", () => {
  test("emits folded UTC calendar with attendees", () => {
    const ics = organizerDashboardExportIcsCreate({
      uid: "ev-sommer@eventoren",
      title: "Sommernachtskonzert",
      description: "Open Air; mit Band, und Chor",
      location: "Hof, Lindenweg 1",
      startsAt: "2026-10-21T17:30:00.000Z",
      endsAt: "2026-10-21T21:30:00.000Z",
      url: "https://eventoren.de/e/sommer",
      attendees: ["lea.schneider@example.de"],
    })
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("DTSTART:20261021T173000Z")
    expect(ics).toContain("ATTENDEE")
    expect(ics).toContain("lea.schneider@example.de")
    expect(ics.endsWith("\r\n")).toBe(true)
  })
})

describe("organizerDashboardExportCursorParse", () => {
  const scope = {
    kind: "exports" as const,
    userId: "u1",
    orgId: "o1",
    eventKey: "e1",
    list: "teilnehmer" as const,
    search: "",
  }
  test("round-trips and rejects foreign scopes", () => {
    const cursor = organizerDashboardExportCursorCreate(scope, "convex-cursor")
    const parsed = organizerDashboardExportCursorParse(scope, cursor)
    expect(parsed.success && parsed.data).toBe("convex-cursor")
    const foreign = organizerDashboardExportCursorParse({ ...scope, list: "checkins" }, cursor)
    expect(foreign.success).toBe(false)
    expect(organizerDashboardExportCursorParse(scope, "nope").success).toBe(false)
  })
})
