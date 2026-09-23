import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"

export function adminEventNewCatalogStateCreate(originalCatalog: AdminCatalogPageState): AdminCatalogPageState {
  const saveEvent = async () => {
    const draft = originalCatalog.eventDraft()
    if (!draft.eventKey.trim() && draft.title.trim()) {
      const slug = draft.title
        .toLowerCase()
        .replace(/[^a-z0-9]+/gu, "-")
        .replace(/^-|-$/gu, "")
      originalCatalog.eventFieldChange("eventKey", `${slug || "event"}-${crypto.randomUUID().slice(0, 8)}`)
    }
    return originalCatalog.saveEvent()
  }

  return {
    ...originalCatalog,
    saveEvent,
    saveTier: async () => {
      const requestedStatus = originalCatalog.eventDraft().status
      if (!originalCatalog.selectedEventKey() && !(await saveEvent())) return
      await originalCatalog.saveTier()
      if (!originalCatalog.errorMessage() && requestedStatus === "published") {
        originalCatalog.eventFieldChange("status", "published")
      }
    },
  }
}
