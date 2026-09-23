import { expect, test } from "bun:test"
import type { EventItem } from "../src/events/EventItem.ts"
import { eventExclusionsGet } from "../src/events/eventExclusionsGet.ts"
import { eventInclusionsGet } from "../src/events/eventInclusionsGet.ts"

test("saved included and excluded items override defaults, including empty lists", () => {
  const event = { id: "kraftklub-arena-berlin", category: "konzerte", title: "Concert", venue: "Arena" } as EventItem
  expect(eventInclusionsGet({ ...event, inclusions: ["Ticket"] })).toEqual(["Ticket"])
  expect(eventExclusionsGet({ ...event, exclusions: ["Travel"] })).toEqual(["Travel"])
  expect(eventInclusionsGet({ ...event, inclusions: [] })).toEqual([])
  expect(eventExclusionsGet({ ...event, exclusions: [] })).toEqual([])
  expect(eventInclusionsGet(event).length).toBeGreaterThan(0)
  expect(eventExclusionsGet(event).length).toBeGreaterThan(0)
})
