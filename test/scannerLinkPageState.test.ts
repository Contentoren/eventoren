import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { demoOrganizerTickets } from "../src/demo/fixtures/demoOrganizerTickets.ts"
import { organizerEventDetailPageStateCreate } from "../src/organizer/organizerEventDetailPageStateCreate.ts"
import { organizerEventListPageStateCreate } from "../src/organizer/organizerEventListPageStateCreate.ts"

test("link event list reports a revoked bearer rather than a generic organizer load failure", async () => {
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof organizerEventListPageStateCreate> | undefined
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = organizerEventListPageStateCreate({
      linkAccess: true,
      dataSource: {
        ...demoOrganizerDataSourceCreate(),
        eventList: async () => ({ success: false, errorMessage: "Link unavailable" }),
      },
    })
  })
  try {
    await state?.reload()
    expect(state?.errorMessage()).toContain("abgelaufen oder wurde widerrufen")
  } finally {
    dispose?.()
  }
})

test("link detail surfaces revoked bearer failures for ticket search and manual check-in", async () => {
  const ticket = demoOrganizerTickets[0]
  if (!ticket) throw new Error("demo ticket missing")
  let dispose: (() => void) | undefined
  let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined
  const source = demoOrganizerDataSourceCreate()
  createRoot((rootDispose) => {
    dispose = rootDispose
    state = organizerEventDetailPageStateCreate({
      eventKey: () => "event-a",
      initialSearch: () => "",
      initialTicketId: () => "",
      searchReplace: () => {},
      linkAccess: true,
      dataSource: {
        ...source,
        ticketList: async () => ({ success: false, errorMessage: "Link unavailable" }),
        ticketCheckIn: async () => ({ success: false, errorMessage: "Link unavailable" }),
        ticketCheckInCode: async () => ({ success: false, errorMessage: "Link unavailable" }),
      },
    })
  })
  try {
    if (!state) throw new Error("detail state missing")
    state.searchChange("person")
    await new Promise((resolve) => setTimeout(resolve, 350))
    expect(state.errorMessage()).toContain("abgelaufen oder wurde widerrufen")
    state.ticketSelect(ticket)
    await state.ticketCheckIn()
    expect(state.errorMessage()).toContain("abgelaufen oder wurde widerrufen")
    await state.scannerCodeSimulate("qr-code")
    expect(state.errorMessage()).toContain("abgelaufen oder wurde widerrufen")
  } finally {
    dispose?.()
  }
})
