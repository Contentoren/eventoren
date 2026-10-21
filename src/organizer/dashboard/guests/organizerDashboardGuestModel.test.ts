import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { organizerDashboardGuestSchema, organizerDashboardGuestSeatsOf } from "./organizerDashboardGuestSchema.ts"
import { organizerDashboardMessageAudienceCount } from "../messages/organizerDashboardMessageAudienceCount.ts"
import { organizerDashboardMessageIcsCreate } from "../messages/organizerDashboardMessageIcsCreate.ts"
import { organizerDashboardMessageContentSchema } from "../messages/organizerDashboardMessageSchema.ts"

describe("guest plusOnes 0-5", () => {
  test("accepts 0 to 5 and counts seats as 1 + plusOnes", () => {
    for (let plusOnes = 0; plusOnes <= 5; plusOnes++) {
      const parsed = v.safeParse(organizerDashboardGuestSchema, { name: " Gast ", plusOnes })
      expect(parsed.success).toBe(true)
      expect(organizerDashboardGuestSeatsOf(plusOnes)).toBe(1 + plusOnes)
    }
  })
  test("rejects -1 and 6", () => {
    for (const plusOnes of [-1, 6]) {
      expect(v.safeParse(organizerDashboardGuestSchema, { name: "Gast", plusOnes }).success).toBe(false)
    }
  })
  test("trims name and keeps optional email empty-safe", () => {
    const parsed = v.safeParse(organizerDashboardGuestSchema, { name: "  Mara  ", plusOnes: 2 })
    expect(parsed.success).toBe(true)
    if (parsed.success) expect(parsed.output.name).toBe("Mara")
  })
})

describe("message audience count", () => {
  const tickets = [
    { tierKey: "stehplatz", cancelled: false, checkedInAt: "2026-10-20T18:00:00.000Z" },
    { tierKey: "stehplatz", cancelled: false, checkedInAt: null },
    { tierKey: "vip", cancelled: false, checkedInAt: null },
    { tierKey: "vip", cancelled: true, checkedInAt: null },
  ]
  test("alle counts live tickets, eingecheckt/nicht-eingecheckt split them", () => {
    expect(organizerDashboardMessageAudienceCount({ type: "alle", tierKeys: [] }, tickets)).toBe(3)
    expect(organizerDashboardMessageAudienceCount({ type: "eingecheckt", tierKeys: [] }, tickets)).toBe(1)
    expect(organizerDashboardMessageAudienceCount({ type: "nicht-eingecheckt", tierKeys: [] }, tickets)).toBe(2)
  })
  test("ticketarten filters by tier and empty tiers match nobody", () => {
    expect(organizerDashboardMessageAudienceCount({ type: "ticketarten", tierKeys: ["vip"] }, tickets)).toBe(1)
    expect(organizerDashboardMessageAudienceCount({ type: "ticketarten", tierKeys: [] }, tickets)).toBe(0)
  })
  test("content schema trims subject and body", () => {
    const parsed = v.safeParse(organizerDashboardMessageContentSchema, {
      kind: "info",
      audience: { type: "alle", tierKeys: [] },
      subject: " Hallo ",
      body: " Text ",
    })
    expect(parsed.success).toBe(true)
    if (parsed.success) {
      expect(parsed.output.subject).toBe("Hallo")
      expect(parsed.output.body).toBe("Text")
    }
  })
})

describe("message ICS generation", () => {
  test("emits UTC instants with folded escaped lines", () => {
    const ics = organizerDashboardMessageIcsCreate({
      uid: "reminder-ev-1@eventoren",
      title: "Sommernachtskonzert, Hof; Bühne",
      description: "Einlass ab 19:00\nBitte früh kommen",
      location: "Lindenhof, Berlin",
      startsAt: "2026-07-11T17:30:00.000Z",
      endsAt: "2026-07-11T21:30:00.000Z",
    })
    expect(ics).toContain("BEGIN:VCALENDAR")
    expect(ics).toContain("DTSTART:20260711T173000Z")
    expect(ics).toContain("DTEND:20260711T213000Z")
    expect(ics).toContain("SUMMARY:Sommernachtskonzert\\, Hof\\; Bühne")
    expect(ics).toContain("DESCRIPTION:Einlass ab 19:00\\nBitte früh kommen")
    expect(ics.endsWith("\r\n")).toBe(true)
  })
  test("omits optional fields when unset", () => {
    const ics = organizerDashboardMessageIcsCreate({
      uid: "x",
      title: "T",
      startsAt: "2026-07-11T17:30:00.000Z",
      endsAt: "2026-07-11T18:30:00.000Z",
    })
    expect(ics).not.toContain("DESCRIPTION")
    expect(ics).not.toContain("LOCATION")
    expect(ics).not.toContain("URL:")
  })
})
