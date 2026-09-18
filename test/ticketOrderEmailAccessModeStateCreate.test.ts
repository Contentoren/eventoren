import { expect, test } from "bun:test"
import { ticketOrderEmailAccessModeStateCreate } from "../src/ticketing/ticketOrderEmailAccessModeStateCreate.ts"

test("starts inactive for SSR and activates from the client fragment on mount", () => {
  const state = ticketOrderEmailAccessModeStateCreate()

  expect(state.isActive()).toBe(false)

  state.initialize("#ticketAccess=")
  expect(state.isActive()).toBe(true)

  state.initialize("")
  expect(state.isActive()).toBe(false)
})
