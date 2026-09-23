import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { organizerEventListPageStateCreate } from "../src/organizer/organizerEventListPageStateCreate.ts"

test("organizer event list displays a fallback for events without a valid start time", () => {
  createRoot((dispose) => {
    const state = organizerEventListPageStateCreate({ dataSource: demoOrganizerDataSourceCreate() })
    expect(state.eventTime("")).toBe("—")
    expect(state.eventTime("invalid")).toBe("—")
    expect(state.eventTime("2026-09-24T08:10:00.000Z")).not.toBe("—")
    dispose()
  })
})
