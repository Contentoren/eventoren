import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventDetailInfoStateCreate } from "./eventDetailInfoStateCreate.ts"
import { eventFaqsGet } from "./eventFaqsGet.ts"
import { eventScheduleGet } from "./eventScheduleGet.ts"

const legacy: EventItem = {
  id: "kraftklub-arena-berlin",
  catalogVersion: 1,
  title: "Konzert",
  subtitle: "",
  description: "",
  category: "Konzert",
  startsAt: "2027-06-01T18:00:00.000Z",
  endsAt: "2027-06-01T21:00:00.000Z",
  doorsAt: "2027-06-01T17:00:00.000Z",
  venue: "Arena",
  city: "Berlin",
  address: "",
  organizer: "",
  imageUrl: "",
  imageAlt: "",
  tags: [],
  tiers: [],
  soldOut: false,
}

function contentState(event: EventItem, overrides?: Parameters<typeof eventDetailInfoStateCreate>[0]) {
  return createRoot(() =>
    eventDetailInfoStateCreate({
      event: () => event,
      faqs: () => event.faqs,
      schedule: () => event.schedule,
      ...overrides,
    }),
  )
}

test("public legacy events with absent catalog fields retain their existing FAQ and schedule fallback", () => {
  const state = contentState(legacy)
  expect(state.faqs()).toEqual(eventFaqsGet(legacy))
  expect(state.schedule()).toEqual(eventScheduleGet(legacy))
  expect(state.hasFaqs()).toBe(true)
  expect(state.hasSchedule()).toBe(true)
})

test("explicitly cleared catalog lists suppress legacy fallbacks instead of resurrecting content", () => {
  const state = contentState({ ...legacy, faqs: [], schedule: [] })
  expect(state.faqs()).toEqual([])
  expect(state.schedule()).toEqual([])
  expect(state.hasFaqs()).toBe(false)
  expect(state.hasSchedule()).toBe(false)
})

test("public catalog rows appear unchanged and explicitly supplied view props still take precedence", () => {
  const faqs = [{ id: "live-faq", question: "Wo?", answer: "Hier" }]
  const schedule = [{ id: "live-slot", marker: "02:30 Uhr (Europe/Berlin)", title: "Nachts" }]
  const state = contentState({ ...legacy, faqs, schedule })
  expect(state.faqs()).toEqual(faqs)
  expect(state.schedule()).toEqual(schedule)
  const overridden = contentState(
    { ...legacy, faqs, schedule },
    { event: () => legacy, faqs: () => [], schedule: () => [] },
  )
  expect(overridden.faqs()).toEqual([])
  expect(overridden.schedule()).toEqual([])
})
