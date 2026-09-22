import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import type { AdminEventDraft } from "./AdminEventDraft.ts"
import { adminCategoryPickerStateCreate } from "./adminCategoryPickerStateCreate.ts"
import { adminDateTimeIsoFromLocal } from "./adminDateTimeIsoFromLocal.ts"
import { adminDateTimeLocalFromIso } from "./adminDateTimeLocalFromIso.ts"

export function adminEventDetailsFormStateCreate(inputs: {
  catalog: AdminCatalogPageState
  onSaved?: (eventKey: string) => void
}) {
  const validationMessage = createSignalObject("")
  const categoryPicker = adminCategoryPickerStateCreate({ catalog: inputs.catalog })
  const statusSignal = {
    get: () => inputs.catalog.eventDraft().status,
    set: (value: string) => inputs.catalog.eventFieldChange("status", value as AdminEventDraft["status"]),
  }
  const canPublish = createMemo(
    () => Boolean(inputs.catalog.selectedEventKey()) && (inputs.catalog.selectedEvent()?.tiers.length ?? 0) > 0,
  )

  const dateValue = (field: "startsAt" | "doorsAt" | "endsAt") =>
    adminDateTimeLocalFromIso(inputs.catalog.eventDraft()[field])

  const dateChange = (field: "startsAt" | "doorsAt" | "endsAt", value: string) => {
    const isoValue = adminDateTimeIsoFromLocal(value)
    if (isoValue === null) {
      validationMessage.set("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      return
    }
    validationMessage.set("")
    inputs.catalog.eventFieldChange(field, isoValue)
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    validationMessage.set("")
    await inputs.catalog.saveEvent()
    const eventKey = inputs.catalog.selectedEventKey()
    if (eventKey && !inputs.catalog.errorMessage()) inputs.onSaved?.(eventKey)
  }

  return {
    categoryPicker,
    validationMessage: validationMessage.get,
    statusSignal,
    statusOptions: () => (canPublish() ? ["draft", "published", "archived"] : ["draft", "archived"]),
    statusLabel: (value: string) =>
      ({ draft: "Entwurf", published: "Veröffentlicht", archived: "Archiviert" })[value] ?? value,
    startsAt: () => dateValue("startsAt"),
    doorsAt: () => dateValue("doorsAt"),
    endsAt: () => dateValue("endsAt"),
    startsAtChange: (value: string) => dateChange("startsAt", value),
    doorsAtChange: (value: string) => dateChange("doorsAt", value),
    endsAtChange: (value: string) => dateChange("endsAt", value),
    canPublish,
    submit,
    publish: () => void inputs.catalog.publishEvent(),
  }
}
