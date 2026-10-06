import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { demoOrganizerTickets } from "../src/demo/fixtures/demoOrganizerTickets.ts"
import type { OrganizerDataSource } from "../src/organizer/OrganizerDataSource.ts"
import { organizerEventDetailPageStateCreate } from "../src/organizer/organizerEventDetailPageStateCreate.ts"
import { organizerTextGet } from "../src/organizer/organizerTextGet.ts"

describe("organizer event detail state", () => {
  test("keeps action messages reactive and clears camera errors after a manual success", async () => {
    languageSignal.set(language.de)
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        searchReplace: () => {},
        dataSource: demoOrganizerDataSourceCreate(),
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("demo ticket was not created")
      state.ticketSelect(ticket)
      state.scannerPermissionDeniedSimulate()
      await state.ticketCheckIn()

      expect(state.successMessage()).toBe(organizerTextGet().actionSuccess)
      expect(state.errorMessage()).toBe("")
      expect(state.scannerErrorMessage()).toBe("")

      languageSignal.set(language.en)
      expect(state.successMessage()).toBe(organizerTextGet().actionSuccess)
      expect(state.errorMessage()).toBe("")
      expect(state.currency(123_456)).toContain("1.234,56")
      expect(state.currency(123_456)).toContain("€")
      expect(state.dateTime("2026-09-18T14:05:00.000Z")).toContain("18.09.2026")
      const checkedInAt = state.selectedTicket()?.checkedInAt
      if (!checkedInAt) throw new Error("successful check-in must provide a timestamp")
      expect(state.dateTime(checkedInAt)).toBe(
        new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(checkedInAt)),
      )
      expect(state.dateTime(checkedInAt)).toMatch(/\d{1,2}:\d{2}/)
      expect(state.elapsed(125_000)).toBe("2 Min. 5 Sek.")
    } finally {
      dispose?.()
      languageSignal.set(language.en)
    }
  })

  test("clears a prior success when the next action is rejected", async () => {
    languageSignal.set(language.de)
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        searchReplace: () => {},
        dataSource: demoOrganizerDataSourceCreate(),
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("demo ticket was not created")
      state.ticketSelect(ticket)
      await state.ticketCheckIn()
      await state.ticketCheckIn()

      expect(state.successMessage()).toBe("")
      expect(state.errorMessage()).toBe(organizerTextGet().duplicateTitle)
      languageSignal.set(language.en)
      expect(state.errorMessage()).toBe(organizerTextGet().duplicateTitle)
    } finally {
      dispose?.()
      languageSignal.set(language.en)
    }
  })

  test("resets pending state when a manual action rejects", async () => {
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined
    const dataSource = demoOrganizerDataSourceCreate()

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        searchReplace: () => {},
        dataSource: {
          ...dataSource,
          ticketCheckIn: async () => {
            throw new Error("backend unavailable")
          },
        },
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("demo ticket was not created")
      state.ticketSelect(ticket)
      await state.ticketCheckIn()
      expect(state.actionPending()).toBe(false)
      expect(state.errorMessage()).toBe(organizerTextGet().actionFailed)
    } finally {
      dispose?.()
    }
  })

  test("keeps checkout pending until reset succeeds, then exposes the unchecked ticket state", async () => {
    const baseDataSource = demoOrganizerDataSourceCreate()
    let releaseReset: (() => void) | undefined
    const resetGate = new Promise<void>((resolve) => {
      releaseReset = resolve
    })
    const dataSource: OrganizerDataSource = {
      ...baseDataSource,
      ticketReset: async (eventKey, ticketId) => {
        await resetGate
        return baseDataSource.ticketReset(eventKey, ticketId)
      },
    }
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        searchReplace: () => {},
        dataSource,
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("demo ticket was not created")
      state.ticketSelect(ticket)
      await state.ticketCheckIn()
      expect(state.selectedTicket()?.checkedIn).toBe(true)

      const reset = state.ticketReset()
      expect(state.actionPending()).toBe(true)
      releaseReset?.()
      await reset

      expect(state.actionPending()).toBe(false)
      expect(state.selectedTicket()?.checkedIn).toBe(false)
      expect(state.successMessage()).toBe(organizerTextGet().resetSuccess)
    } finally {
      dispose?.()
    }
  })

  test("traverses empty pages, preserves global order, and resets the cursor on search", async () => {
    const firstTicket = demoOrganizerTickets[0]
    const thirdTicket = demoOrganizerTickets[2]
    const fourthTicket = demoOrganizerTickets[3]
    if (!firstTicket || !thirdTicket || !fourthTicket) throw new Error("demo tickets were not created")

    const calls: { readonly search: string; readonly cursor: string | null }[] = []
    const dataSource: OrganizerDataSource = {
      ...demoOrganizerDataSourceCreate(),
      ticketList: async (_eventKey, query, paginationOpts) => {
        calls.push({ search: query, cursor: paginationOpts.cursor })
        const search = query.trim().toLowerCase()
        if (!search && paginationOpts.cursor === null) {
          return {
            success: true,
            data: { page: [thirdTicket], isDone: false, continueCursor: "all-1" },
          }
        }
        if (!search && paginationOpts.cursor === "all-1") {
          return {
            success: true,
            data: { page: [], isDone: false, continueCursor: "all-2" },
          }
        }
        if (!search && paginationOpts.cursor === "all-2") {
          return {
            success: true,
            data: { page: [firstTicket], isDone: true, continueCursor: "all-done" },
          }
        }
        if (search === "target" && paginationOpts.cursor === null) {
          return {
            success: true,
            data: { page: [], isDone: false, continueCursor: "target-1" },
          }
        }
        if (search === "target" && paginationOpts.cursor === "target-1") {
          return {
            success: true,
            data: { page: [fourthTicket], isDone: true, continueCursor: "target-done" },
          }
        }
        return { success: true, data: { page: [], isDone: true, continueCursor: "done" } }
      },
    }

    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerEventDetailPageStateCreate> | undefined
    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerEventDetailPageStateCreate({
        eventKey: () => "xyz",
        initialSearch: () => "",
        initialTicketId: () => "",
        searchReplace: () => {},
        dataSource,
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      state.searchChange("")
      await wait(400)
      expect(state.tickets().map((ticket) => ticket.sequence)).toEqual([3])
      expect(state.isDone()).toBe(false)

      state.loadMore()
      await wait(100)
      expect(state.tickets().map((ticket) => ticket.sequence)).toEqual([1, 3])
      expect(state.isDone()).toBe(true)

      state.searchChange("target")
      expect(state.tickets()).toEqual([])
      expect(state.isDone()).toBe(false)
      await wait(400)

      expect(state.tickets().map((ticket) => ticket.sequence)).toEqual([4])
      expect(state.isDone()).toBe(true)
      expect(calls).toEqual([
        { search: "", cursor: null },
        { search: "", cursor: null },
        { search: "", cursor: "all-1" },
        { search: "", cursor: "all-2" },
        { search: "target", cursor: null },
        { search: "target", cursor: "target-1" },
      ])
    } finally {
      dispose?.()
    }
  })
})

async function wait(milliseconds: number): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, milliseconds))
}
