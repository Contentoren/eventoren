import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import type { AdminEventDraft } from "./AdminEventDraft.ts"

export function adminEventHighlightsFieldsStateCreate(inputs: { catalog: AdminCatalogPageState }) {
  const highlights = () => inputs.catalog.eventDraft().highlights
  const add = () => inputs.catalog.eventFieldChange("highlights", [...highlights(), { title: "", description: "" }])
  const remove = (index: number) =>
    inputs.catalog.eventFieldChange(
      "highlights",
      highlights().filter((_, itemIndex) => itemIndex !== index),
    )
  const change = (index: number, field: keyof AdminEventDraft["highlights"][number], value: string) =>
    inputs.catalog.eventFieldChange(
      "highlights",
      highlights().map((highlight, itemIndex) => (itemIndex === index ? { ...highlight, [field]: value } : highlight)),
    )

  return { highlights, add, remove, change }
}
