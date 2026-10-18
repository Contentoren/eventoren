import { describe, expect, test } from "bun:test"
import { dashProfileEventsSplit } from "./dashProfileEventsSplit.ts"
import type { DashEvent } from "../../model/dashEventSchema.ts"

const base: DashEvent = {
  id: "ev-test",
  orgId: "org-lindenhof",
  slug: "test-event",
  title: "Test",
  subtitle: "",
  category: "konzert",
  startsAt: "2026-06-01T20:00:00.000Z",
  endsAt: "2026-06-01T23:00:00.000Z",
  doorsAt: null,
  venue: { name: "Saal", street: "Straße 1", zip: "04109", city: "Leipzig" },
  imageUrl: "",
  imageAlt: "",
  description: "",
  faq: [],
  schedule: [],
  status: "veroeffentlicht",
  visibility: "oeffentlich",
  salesPaused: false,
  cancelReason: "",
  boxOffice: { enabled: false, opensAt: null },
  reminder: { enabled: false, hoursBefore: 24, directions: "", calendar: "", sentAt: null },
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  publishedAt: "2026-01-02T00:00:00.000Z",
}

const event = (patch: Partial<DashEvent>): DashEvent => ({ ...base, ...patch })

describe("dashProfileEventsSplit", () => {
  const now = new Date("2026-05-01T12:00:00.000Z")

  test("teilt kommende und vergangene öffentliche Events", () => {
    const future = event({ id: "ev-future", startsAt: "2026-06-01T20:00:00.000Z" })
    const past = event({ id: "ev-past", startsAt: "2026-04-01T20:00:00.000Z" })
    const split = dashProfileEventsSplit({ events: [past, future], now })
    expect(split.upcoming.map((entry) => entry.id)).toEqual(["ev-future"])
    expect(split.past.map((entry) => entry.id)).toEqual(["ev-past"])
  })

  test("blendet Entwürfe und nicht-gelistete Events aus", () => {
    const draft = event({ id: "ev-draft", status: "entwurf" })
    const unlisted = event({ id: "ev-unlisted", visibility: "nicht-gelistet" })
    const split = dashProfileEventsSplit({ events: [draft, unlisted], now })
    expect(split.upcoming).toEqual([])
    expect(split.past).toEqual([])
  })

  test("zeigt abgesagte Events nur unter vergangen, auch in der Zukunft", () => {
    const cancelled = event({ id: "ev-cancelled", status: "abgesagt", startsAt: "2026-07-01T20:00:00.000Z" })
    const split = dashProfileEventsSplit({ events: [cancelled], now })
    expect(split.upcoming).toEqual([])
    expect(split.past.map((entry) => entry.id)).toEqual(["ev-cancelled"])
  })

  test("sortiert kommend aufsteigend und vergangen absteigend", () => {
    const first = event({ id: "ev-first", startsAt: "2026-06-01T20:00:00.000Z" })
    const second = event({ id: "ev-second", startsAt: "2026-08-01T20:00:00.000Z" })
    const oldFirst = event({ id: "ev-old-first", startsAt: "2026-03-01T20:00:00.000Z" })
    const oldSecond = event({ id: "ev-old-second", startsAt: "2026-04-01T20:00:00.000Z" })
    const split = dashProfileEventsSplit({ events: [second, oldFirst, first, oldSecond], now })
    expect(split.upcoming.map((entry) => entry.id)).toEqual(["ev-first", "ev-second"])
    expect(split.past.map((entry) => entry.id)).toEqual(["ev-old-second", "ev-old-first"])
  })
})
