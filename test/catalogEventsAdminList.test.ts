import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { catalogEventsAdminList } from "../src/catalog/client/catalogEventsAdminList.ts"

function adminEventItem(id: string, status: AdminEventItem["status"]): AdminEventItem {
  return {
    id,
    status,
    catalogVersion: 1,
    title: id,
    subtitle: "",
    description: "",
    category: "konzerte",
    startsAt: "2026-10-01T18:00:00.000Z",
    endsAt: "2026-10-01T22:00:00.000Z",
    doorsAt: "2026-10-01T17:00:00.000Z",
    venue: "Test hall",
    city: "Berlin",
    address: "Teststraße 1",
    organizer: "Eventoren",
    imageUrl: "/images/test.webp",
    imageAlt: "Test event",
    tags: [],
    soldOut: false,
    tiers: [],
  }
}

test("admin event client loads every authorized query page", async () => {
  const cursors: (string | null)[] = []
  const client = {
    query: async (_query: unknown, args: { paginationOpts: { cursor: string | null } }) => {
      cursors.push(args.paginationOpts.cursor)
      if (args.paginationOpts.cursor === null) {
        return {
          success: true as const,
          data: {
            page: [adminEventItem("draft-event", "draft")],
            isDone: false,
            continueCursor: "next-page",
          },
        }
      }
      return {
        success: true as const,
        data: {
          page: [adminEventItem("archived-event", "archived")],
          isDone: true,
          continueCursor: "",
        },
      }
    },
  } as unknown as ConvexHttpClient

  const result = await catalogEventsAdminList("admin-token", client)

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.map((event) => [event.id, event.status])).toEqual([
    ["draft-event", "draft"],
    ["archived-event", "archived"],
  ])
  expect(cursors).toEqual([null, "next-page"])
})

test("admin event client returns query failures instead of an empty list", async () => {
  const client = {
    query: async () => ({ success: false as const, errorMessage: "Admin query unavailable" }),
  } as unknown as ConvexHttpClient

  const result = await catalogEventsAdminList("admin-token", client)

  expect(result.success).toBe(false)
  if (result.success) return
  expect(result.errorMessage).toBe("Admin query unavailable")
})
