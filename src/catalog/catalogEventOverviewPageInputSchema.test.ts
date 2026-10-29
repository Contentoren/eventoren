import { expect, test } from "bun:test"
import * as v from "valibot"
import { catalogEventOverviewPageInputSchema } from "./catalogEventOverviewPageInputSchema.ts"

test("overview pagination validates bounded page size and standard cursors", () => {
  const input = {
    token: "token",
    eventKey: "event",
    paginationOpts: { numItems: 50, cursor: null, endCursor: "end", id: 1 },
  }
  expect(v.safeParse(catalogEventOverviewPageInputSchema, input).success).toBe(true)
  for (const numItems of [0, 51, 1.5]) {
    expect(
      v.safeParse(catalogEventOverviewPageInputSchema, {
        ...input,
        paginationOpts: { ...input.paginationOpts, numItems },
      }).success,
    ).toBe(false)
  }
})
