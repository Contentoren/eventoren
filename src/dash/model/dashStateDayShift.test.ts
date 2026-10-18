import { describe, expect, test } from "bun:test"

import { dashStateDayShift } from "./dashStateDayShift.ts"
import { dashSeedCreate } from "../store/seed/dashSeedCreate.ts"

describe("dashStateDayShift", () => {
  test("verschiebt alle Zeitpunkte um Kalendertage und behält die Berliner Uhrzeit", () => {
    const state = {
      ...dashSeedCreate(new Date("2026-10-26T10:00:00.000Z")),
      events: [
        {
          id: "ev-sommer",
          orgId: "org-lindenhof",
          slug: "sommernachtskonzert",
          title: "Sommernachtskonzert",
          subtitle: "",
          category: "konzert",
          startsAt: "2026-08-06T18:00:00.000Z",
          endsAt: "2026-08-06T21:30:00.000Z",
          doorsAt: "2026-08-06T17:00:00.000Z",
          venue: { name: "Lindenhof", street: "Lindenweg 1", zip: "10115", city: "Berlin" },
          imageUrl: "",
          imageAlt: "Bühne bei Sonnenuntergang",
          description: "",
          faq: [],
          schedule: [],
          status: "veroeffentlicht",
          visibility: "oeffentlich",
          salesPaused: false,
          cancelReason: "",
          boxOffice: { enabled: false, opensAt: null },
          reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
          createdAt: "2026-10-18T10:00:00.000Z",
          updatedAt: "2026-10-18T10:00:00.000Z",
          publishedAt: null,
        },
      ],
    } as never as Parameters<typeof dashStateDayShift>[0]

    const shifted = dashStateDayShift(state, 3)
    expect(shifted.events[0]?.startsAt).toBe("2026-08-09T18:00:00.000Z")
    expect(shifted.events[0]?.endsAt).toBe("2026-08-09T21:30:00.000Z")
    expect(shifted.events[0]?.doorsAt).toBe("2026-08-09T17:00:00.000Z")
    expect(shifted.seededAt).toBe("2026-10-29T10:00:00.000Z")
    expect(shifted.events[0]?.title).toBe("Sommernachtskonzert")
    expect(shifted.events[0]?.venue.city).toBe("Berlin")
  })

  test("hält 20:00 Berlin über die DST-Grenze und lässt Nicht-Zeiten stehen", () => {
    const state = {
      ...dashSeedCreate(new Date("2026-10-26T10:00:00.000Z")),
      events: [
        {
          id: "ev-jazz",
          orgId: "org-lindenhof",
          slug: "jazz-und-wein",
          title: "Jazz & Wein",
          subtitle: "",
          category: "konzert",
          startsAt: "2026-10-24T18:00:00.000Z",
          endsAt: "2026-10-24T21:00:00.000Z",
          doorsAt: null,
          venue: { name: "Lindenhof", street: "Lindenweg 1", zip: "10115", city: "Berlin" },
          imageUrl: "",
          imageAlt: "Band auf der Bühne",
          description: "T-20:00 Hinweis",
          faq: [],
          schedule: [{ id: "sch-1", time: "20:00", title: "Beginn", detail: "" }],
          status: "veroeffentlicht",
          visibility: "oeffentlich",
          salesPaused: false,
          cancelReason: "",
          boxOffice: { enabled: false, opensAt: null },
          reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
          createdAt: "2026-10-18T10:00:00.000Z",
          updatedAt: "2026-10-18T10:00:00.000Z",
          publishedAt: null,
        },
      ],
    } as never as Parameters<typeof dashStateDayShift>[0]

    const shifted = dashStateDayShift(state, 2)
    // 2026-10-24 20:00 CEST (UTC+2) → 2026-10-26 20:00 CET (UTC+1)
    expect(shifted.events[0]?.startsAt).toBe("2026-10-26T19:00:00.000Z")
    expect(shifted.events[0]?.description).toBe("T-20:00 Hinweis")
    expect(shifted.events[0]?.schedule[0]?.time).toBe("20:00")
  })

  test("gibt bei 0 Tagen denselben Zustand zurück", () => {
    const state = dashSeedCreate(new Date("2026-10-18T10:00:00.000Z"))
    expect(dashStateDayShift(state, 0)).toBe(state)
  })
})
