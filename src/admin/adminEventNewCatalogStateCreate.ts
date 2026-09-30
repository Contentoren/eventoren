import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"

export function adminEventNewCatalogStateCreate(
  originalCatalog: AdminCatalogPageState,
  onSaved?: (eventKey: string) => void | Promise<void>,
): AdminCatalogPageState {
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
      const eventKey = originalCatalog.selectedEventKey() || (await saveEvent())
      if (!eventKey) return
      await originalCatalog.saveTier()
      if (originalCatalog.errorMessage()) return
      if (requestedStatus === "published") {
        originalCatalog.eventFieldChange("status", "published")
      }
      await onSaved?.(eventKey)
    },
  }
}
