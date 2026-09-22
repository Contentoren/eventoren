import { expect, test } from "bun:test"
import { demoLegacyRouteRedirect } from "../src/demo/model/demoLegacyRouteRedirect.ts"

test("legacy demo redirects preserve query, hash, and replace history", () => {
  let caught: unknown
  try {
    demoLegacyRouteRedirect("/demo/customer/events", {
      searchStr: "?demoState=error&ticket=demo-ticket",
      hash: "tickets",
    })
  } catch (error) {
    caught = error
  }

  expect(caught).toBeInstanceOf(Response)
  const redirect = caught as Response & { options?: { href?: string; replace?: boolean } }
  expect(redirect.options?.href).toBe("/demo/customer/events?demoState=error&ticket=demo-ticket#tickets")
  expect(redirect.options?.replace).toBe(true)
})
