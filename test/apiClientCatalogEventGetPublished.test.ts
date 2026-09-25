import { expect, test } from "bun:test"
import { apiClientCatalogEventGetPublished } from "../src/client/apiClient.ts"

test("event detail lazily assembles all 51+ tiers from bounded cursor queries and keeps its full-item API", async () => {
  const cursors: (string | null)[] = []
  const tiers = Array.from({ length: 51 }, (_, index) => ({
    id: `tier-${index}`,
    sortOrder: 50 - index,
    priceCents: index === 50 ? 100 : 2500,
    available: index === 50 ? 1 : 0,
  }))
  const client = {
    query: async (
      _query: unknown,
      input: { eventKey: string; paginationOpts?: { numItems: number; cursor: string | null } },
    ) => {
      expect(input.eventKey).toBe("many-tiers")
      if (!input.paginationOpts) return { id: "many-tiers", tiers: [], soldOut: false, tiersComplete: false }
      expect(input.paginationOpts.numItems).toBe(50)
      cursors.push(input.paginationOpts.cursor)
      const start = input.paginationOpts.cursor === null ? 0 : 50
      return {
        success: true,
        data: { page: tiers.slice(start, start + 50), isDone: start === 50, continueCursor: "next" },
      }
    },
  }

  const result = await apiClientCatalogEventGetPublished("many-tiers", client as never)

  expect(cursors).toEqual([null, "next"])
  expect(result.success).toBe(true)
  if (!result.success || !result.data) return
  expect(result.data.tiers).toHaveLength(51)
  expect(result.data.tiers[0]?.id).toBe("tier-50")
  expect(result.data.tiersComplete).toBeUndefined()
  expect(result.data.soldOut).toBe(false)
})
