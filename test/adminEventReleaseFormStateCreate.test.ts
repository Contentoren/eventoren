import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminCatalogPageStateCreate } from "../src/admin/adminCatalogPageStateCreate.ts"
import { adminEventReleaseFormStateCreate } from "../src/admin/adminEventReleaseFormStateCreate.ts"
import { createResult } from "../src/ui/createResult.ts"

test("release form saves German time and removes the schedule only after submitting", async () => {
  await createRoot(async (dispose) => {
    try {
      const saved: string[] = []
      const catalog = adminCatalogPageStateCreate({
        events: () => [],
        isServerAuthorized: () => true,
        reloadEvents: async () => createResult([]),
        eventUpsert: async (input) => {
          saved.push(input.bookingOpensAt ?? "")
          return createResult({ eventKey: input.eventKey, catalogVersion: 1 })
        },
      })
      catalog.eventFieldChange("eventKey", "release-test")
      catalog.eventFieldChange("title", "Release test")
      const form = adminEventReleaseFormStateCreate({ catalog: () => catalog })
      const dateInput = { value: "2026-10-14" }
      const timeInput = { value: "18:30" }
      const formElement = {
        querySelector: (selector: string) => (selector === "select" ? timeInput : dateInput),
      } as unknown as HTMLFormElement
      const event = { preventDefault() {}, currentTarget: formElement } as SubmitEvent & {
        currentTarget: HTMLFormElement
      }

      form.change("2026-10-14T18:30")
      expect(form.value()).toBe("2026-10-14T18:30")
      expect(saved).toEqual([])
      await form.submit(event)
      expect(saved).toEqual(["2026-10-14T16:30:00.000Z"])

      dateInput.value = "2026-03-29"
      timeInput.value = "02:30"
      form.change("2026-03-29T02:30")
      await form.submit(event)
      expect(form.validation()).not.toBe("")
      expect(saved).toHaveLength(1)

      form.clear({ currentTarget: { form: formElement } } as unknown as MouseEvent & {
        currentTarget: HTMLButtonElement
      })
      expect(form.validation()).toBe("")
      expect(saved).toHaveLength(1)
      await form.submit(event)
      expect(saved).toEqual(["2026-10-14T16:30:00.000Z", ""])
    } finally {
      dispose()
    }
  })
})
