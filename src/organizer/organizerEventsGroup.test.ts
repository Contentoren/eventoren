import { expect, test } from "bun:test"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import { organizerEventsGroup } from "./organizerEventsGroup.ts"

function eventCreate(id: string, startsAt: string): OrganizerEvent {
  return {
    id,
    eventKey: id,
    title: id,
    imageUrl: "",
    imageAlt: "",
    startsAt,
    doorsAt: startsAt,
    endsAt: startsAt,
    status: "published",
  }
}

test("organizer events are grouped and ordered by their Berlin calendar day", () => {
  const groups = organizerEventsGroup([
    eventCreate("early", "2026-06-25T01:00:00Z"),
    eventCreate("before", "2026-06-24T21:30:00Z"),
    eventCreate("late", "2026-06-24T22:30:00Z"),
  ])
  expect(groups.map((group) => group.key)).toEqual(["2026-5-24", "2026-5-25"])
  expect(groups[1]?.heading).toBe("Donnerstag, 25. Juni 2026")
  expect(groups[1]?.events.map((event) => event.id)).toEqual(["late", "early"])
})

test("organizer group keys retain their format across Berlin's winter year boundary", () => {
  const group = organizerEventsGroup([eventCreate("new-year", "2026-12-31T23:30:00Z")])[0]
  expect(group?.key).toBe("2027-0-1")
  expect(group?.heading).toBe("Freitag, 01. Januar 2027")
})
