import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { catalogEventUpsert } from "../src/catalog/client/catalogEventUpsert.ts"
import type { CatalogEventUpsertInput } from "../src/catalog/client/CatalogEventUpsertInput.ts"

test("shows the underlying reason when the event mutation fails", async () => {
  const client = {
    mutation: async () => {
      throw new Error("Katalog nicht erreichbar")
    },
  } as unknown as ConvexHttpClient

  const result = await catalogEventUpsert({} as CatalogEventUpsertInput, client)

  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.errorMessage).toBe("Event konnte nicht gespeichert werden: Katalog nicht erreichbar")
  }
})
