import { describe, expect, test } from "bun:test"
import { veranstalterDashboardEventsTabResolve } from "./veranstalterDashboardEventsTabResolve.ts"

describe("veranstalterDashboardEventsTabResolve maps tabs to canonical UTC list queries", () => {
  const now = "2027-06-01T12:00:00.000Z"

  test("current lists published events starting now or later", () => {
    expect(veranstalterDashboardEventsTabResolve("current", now)).toEqual({
      status: "published",
      fromStartsAt: now,
      sort: "startsAtAsc",
    })
  })

  test("draft lists draft events", () => {
    expect(veranstalterDashboardEventsTabResolve("draft", now)).toEqual({
      status: "draft",
      sort: "startsAtAsc",
    })
  })

  test("past lists every status before now, newest first", () => {
    expect(veranstalterDashboardEventsTabResolve("past", now)).toEqual({
      toStartsAt: now,
      sort: "startsAtDesc",
    })
  })
})
