import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { demoOrganizerTickets } from "../src/demo/fixtures/demoOrganizerTickets.ts"
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
        token: () => "demo",
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("demo ticket was not created")
      state.ticketSelect(ticket)
      state.scannerPermissionDeniedSimulate()
      await state.ticketCheckIn()

      expect(state.successMessage()).toBe(organizerTextGet(language.de).actionSuccess)
      expect(state.errorMessage()).toBe("")
      expect(state.scannerErrorMessage()).toBe("")

      languageSignal.set(language.en)
      expect(state.successMessage()).toBe(organizerTextGet(language.en).actionSuccess)
      expect(state.errorMessage()).toBe("")
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
        token: () => "demo",
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
      expect(state.errorMessage()).toBe(organizerTextGet(language.de).duplicateTitle)
      languageSignal.set(language.en)
      expect(state.errorMessage()).toBe(organizerTextGet(language.en).duplicateTitle)
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
        token: () => "demo",
      })
    })

    try {
      if (!state) throw new Error("detail state was not created")
      const ticket = demoOrganizerTickets[0]
      if (!ticket) throw new Error("demo ticket was not created")
      state.ticketSelect(ticket)
      await state.ticketCheckIn()
      expect(state.actionPending()).toBe(false)
      expect(state.errorMessage()).toBe(organizerTextGet(language.en).actionFailed)
    } finally {
      dispose?.()
    }
  })
})
