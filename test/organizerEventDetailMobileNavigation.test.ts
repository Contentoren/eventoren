import { describe, expect, jest, test } from "bun:test"
import { createRoot } from "solid-js"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { demoOrganizerTickets } from "../src/demo/fixtures/demoOrganizerTickets.ts"
import type { OrganizerTicket } from "../src/organizer/OrganizerTicket.ts"
import { organizerEventDetailMobileNavStateCreate } from "../src/organizer/organizerEventDetailMobileNavStateCreate.ts"
import { organizerEventDetailPageStateCreate } from "../src/organizer/organizerEventDetailPageStateCreate.ts"
import { organizerEventDetailPageViewStateCreate } from "../src/organizer/organizerEventDetailPageViewStateCreate.ts"
import { organizerEventDetailScannerLifecycleStateCreate } from "../src/organizer/organizerEventDetailScannerLifecycleStateCreate.ts"
import { organizerEventDetailSearchParse } from "../src/organizer/organizerEventDetailSearchParse.ts"
import { organizerTextGet } from "../src/organizer/organizerTextGet.ts"

describe("organizer mobile destinations", () => {
  test("a URL-opened mobile Scanner starts on entry and stops on tab exit", () => {
    createRoot((dispose) => {
      const state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        initialMobileView: () => "scanner",
        searchReplace: () => {},
        dataSource: demoOrganizerDataSourceCreate(),
      })
      state.scannerVideoSet({} as HTMLVideoElement)
      let visible = true
      const lifecycle = organizerEventDetailScannerLifecycleStateCreate({
        state: () => state,
        mobile: () => true,
        visible: () => visible,
      })
      try {
        lifecycle.scannerVisibilitySync()
        expect(state.scannerErrorMessage()).toBe(organizerTextGet().scannerSecureContext)
        visible = false
        lifecycle.scannerVisibilitySync()
        expect(state.scannerActive()).toBe(false)
      } finally {
        dispose()
      }
    })
  })

  test("mobile scan feedback resets its three-second timeout for a later duplicate", async () => {
    jest.useFakeTimers()
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined
    let lifecycle: ReturnType<typeof organizerEventDetailScannerLifecycleStateCreate> | undefined
    createRoot((rootDispose) => {
      dispose = rootDispose
      let checkIns = 0
      const dataSource = demoOrganizerDataSourceCreate()
      const pageState = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        initialMobileView: () => "scanner",
        searchReplace: () => {},
        dataSource: {
          ...dataSource,
          ticketCheckInCode: async () => {
            checkIns += 1
            if (checkIns === 1) return { success: true, data: {} as OrganizerTicket }
            return {
              success: false,
              errorCode: "organizer.check-in.duplicate",
              errorMessage: "duplicate",
            }
          },
        },
      })
      state = pageState
      pageState.scannerVideoSet({} as HTMLVideoElement)
      lifecycle = organizerEventDetailScannerLifecycleStateCreate({
        state: () => pageState,
        mobile: () => true,
        visible: () => true,
      })
    })

    try {
      if (!state) throw new Error("page state was not created")
      const scannerState = state
      await scannerState.scannerCodeSimulate("mobile-success")
      expect(scannerState.scannerOutcome()?.kind).toBe("success")
      expect(scannerState.scannerOutcome()?.message).toBe(organizerTextGet().scanSuccess)
      lifecycle?.scannerFeedbackSync()
      jest.advanceTimersByTime(2_000)
      await scannerState.scannerCodeSimulate("mobile-duplicate")
      expect(scannerState.scannerOutcome()?.kind).toBe("denied")
      expect(scannerState.scannerOutcome()?.message).toBe(organizerTextGet().duplicateTitle)
      lifecycle?.scannerFeedbackSync()

      jest.advanceTimersByTime(1_000)
      expect(scannerState.scannerOutcome()?.kind).toBe("denied")
      jest.advanceTimersByTime(1_999)
      expect(scannerState.scannerOutcome()?.kind).toBe("denied")
      jest.advanceTimersByTime(1)
      expect(scannerState.scannerOutcome()).toBeNull()
    } finally {
      lifecycle?.scannerLifecycleCleanup()
      dispose?.()
      jest.useRealTimers()
    }
  })

  test("mobile destination state never hides desktop ticket data or opens its scanner", () => {
    createRoot((dispose) => {
      const state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "ticket-1",
        initialMobileView: () => "profile",
        searchReplace: () => {},
        dataSource: demoOrganizerDataSourceCreate(),
      })
      const view = organizerEventDetailPageViewStateCreate({ state: () => state, mobileNavigation: () => true })
      try {
        expect(view.mobile()).toBe(false)
        expect(view.profileVisible()).toBe(false)
        expect(view.ticketsVisible()).toBe(true)
        expect(view.tickets()).toEqual([])
        state.mobileViewSelect("scanner")
        expect(view.scannerVisible()).toBe(false)
        expect(view.ticketsVisible()).toBe(true)
      } finally {
        dispose()
      }
    })
  })
  test("tabs preserve search and inline selection; tapping the same row collapses it", () => {
    createRoot((dispose) => {
      const writes: unknown[][] = []
      const state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "Ada",
        initialTicketId: () => "",
        searchReplace: (...values) => {
          writes.push(values)
        },
        dataSource: demoOrganizerDataSourceCreate(),
      })
      const nav = organizerEventDetailMobileNavStateCreate(() => state)
      try {
        expect(state.mobileView()).toBe("tickets")
        const ticket = demoOrganizerTickets[0]
        if (!ticket) throw new Error("missing ticket fixture")
        state.ticketSelect(ticket)
        nav.profileShow()
        expect(state.mobileView()).toBe("profile")
        nav.scannerShow()
        expect(state.mobileView()).toBe("scanner")
        expect(state.scannerOpen()).toBe(false)
        nav.ticketsShow()
        expect(state.mobileView()).toBe("tickets")
        expect(state.search()).toBe("Ada")
        expect(state.selectedTicketId()).toBe(ticket.id)
        expect(state.selectedTicket()).toBe(ticket)
        state.ticketSelect(ticket)
        expect(state.selectedTicketId()).toBe("")
        expect(state.selectedTicket()).toBeUndefined()
        expect(state.search()).toBe("Ada")
        expect(writes).toEqual([
          ["Ada", ticket.id, "tickets"],
          ["Ada", ticket.id, "profile"],
          ["Ada", ticket.id, "scanner"],
          ["Ada", ticket.id, "tickets"],
          ["Ada", "", "tickets"],
        ])
      } finally {
        dispose()
      }
    })
  })

  test("check-in and reset update the selected inline row without clearing its URL selection", async () => {
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined
    const writes: unknown[][] = []
    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "Alex",
        initialTicketId: () => "",
        searchReplace: (...values) => writes.push(values),
        dataSource: demoOrganizerDataSourceCreate(),
      })
    })
    try {
      if (!state) throw new Error("page state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("missing ticket fixture")
      state.ticketSelect(ticket)
      await state.ticketCheckIn()
      expect(state.selectedTicketId()).toBe(ticket.id)
      expect(state.selectedTicket()?.checkedIn).toBe(true)
      await state.ticketReset()
      expect(state.selectedTicketId()).toBe(ticket.id)
      expect(state.selectedTicket()?.checkedIn).toBe(false)
      expect(writes).toEqual([
        ["Alex", ticket.id, "tickets"],
        ["Alex", ticket.id, "tickets"],
        ["Alex", ticket.id, "tickets"],
      ])
    } finally {
      dispose?.()
    }
  })

  test("URL-selected ticket defaults to Tickets, and explicit destinations are validated", () => {
    createRoot((dispose) => {
      const state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "Ada",
        initialTicketId: () => "ticket-1",
        searchReplace: () => {},
        dataSource: demoOrganizerDataSourceCreate(),
      })
      try {
        expect(state.mobileView()).toBe("tickets")
        expect(state.selectedTicketId()).toBe("ticket-1")
        expect(organizerEventDetailSearchParse({ q: "Ada", ticket: "ticket-1", view: "profile" })).toEqual({
          q: "Ada",
          ticket: "ticket-1",
          view: "profile",
        })
        expect(organizerEventDetailSearchParse({ view: "drawer" })).toEqual({})
      } finally {
        dispose()
      }
    })
  })
})
