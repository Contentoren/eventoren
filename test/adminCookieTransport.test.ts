import { expect, test } from "bun:test"
import { createResult } from "#result"
import { adminTicketOrdersPageStateCreate } from "../src/admin/adminTicketOrdersPageStateCreate.ts"
import { adminSessionTokenRead } from "../src/server/adminSessionTokenRead.ts"

test("admin transport reads only the canonical session cookie", () => {
  expect(adminSessionTokenRead("other=value; eventoren-session=cookie-token; another=value")).toEqual({
    success: true,
    data: "cookie-token",
  })
})

test("admin transport rejects a request without the session cookie", () => {
  const result = adminSessionTokenRead("other=value")

  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errorMessage).toBe("Anmeldung erforderlich")
})

test("admin order pagination does not require a browser token", async () => {
  let receivedInput: unknown
  const state = adminTicketOrdersPageStateCreate({
    list: async (input) => {
      receivedInput = input
      return createResult({ page: [], continueCursor: "", isDone: true })
    },
  })

  await state.loadMore()

  expect(receivedInput).toEqual({ paginationOpts: { cursor: null, numItems: 50 } })
  expect(state.isDone()).toBe(true)
})
