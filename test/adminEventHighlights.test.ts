import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventHighlightsFieldsStateCreate } from "../src/admin/adminEventHighlightsFieldsStateCreate.ts"
import type { CatalogEventUpsertInput } from "../src/catalog/client/CatalogEventUpsertInput.ts"
import { createResult } from "../src/ui/createResult.ts"

test("adds, edits, removes and saves multiple event highlights with descriptions", async () => {
  await createRoot(async (dispose) => {
    try {
      let saved: Omit<CatalogEventUpsertInput, "token"> | undefined
      const catalog = adminCatalogPageStateCreate({
        events: () => [],
        isServerAuthorized: () => true,
        reloadEvents: async () => ({ success: true, data: [] }),
        eventUpsert: async (input) => {
          saved = input
          return createResult({ eventKey: input.eventKey, catalogVersion: 1 })
        },
      })
      catalog.eventFieldChange("eventKey", "concert")
      catalog.eventFieldChange("title", "Concert")
      const fields = adminEventHighlightsFieldsStateCreate({ catalog })
      fields.add()
      fields.change(0, "title", "First")
      fields.change(0, "description", "First description")
      fields.add()
      fields.change(1, "title", "Second")
      fields.change(1, "description", "Second description")
      fields.add()
      fields.remove(2)

      await catalog.saveEvent()

      expect(saved?.highlights).toEqual([
        { title: "First", description: "First description" },
        { title: "Second", description: "Second description" },
      ])
      expect(saved?.tags).toEqual(["First", "Second"])
    } finally {
      dispose()
    }
  })
})
