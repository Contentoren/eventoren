import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { adminEuroFromCents } from "./adminEuroFromCents.ts"
import { adminEuroToCents } from "./adminEuroToCents.ts"
import { adminDateTimeIsoFromLocal } from "./adminDateTimeIsoFromLocal.ts"
import { adminDateTimeLocalFromIso } from "./adminDateTimeLocalFromIso.ts"

export function adminTicketProductsFormStateCreate(catalog: AdminCatalogPageState) {
  const priceEuro = createSignalObject(
    catalog.tierDraft().priceCents !== "" ? adminEuroFromCents(Number(catalog.tierDraft().priceCents)) : "",
  )
  const feeEuro = createSignalObject(
    catalog.tierDraft().feeCents !== "" ? adminEuroFromCents(Number(catalog.tierDraft().feeCents)) : "",
  )
  const validationMessage = createSignalObject("")
  const hydrated = createSignalObject(false)
  const draggedTierKey = createSignalObject("")
  const dropTargetKey = createSignalObject("")
  const showNewTier = createSignalObject(false)

  const dragStart = (event: DragEvent, tierKey: string) => {
    if (catalog.isSaving()) {
      event.preventDefault()
      return
    }
    draggedTierKey.set(tierKey)
    event.dataTransfer?.setData("text/plain", tierKey)
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move"
  }

  const dragOver = (event: DragEvent, tierKey: string) => {
    if (!draggedTierKey.get() || draggedTierKey.get() === tierKey) return
    event.preventDefault()
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move"
    dropTargetKey.set(tierKey)
  }

  const dragEnd = () => {
    draggedTierKey.set("")
    dropTargetKey.set("")
  }

  const drop = (event: DragEvent, tierKey: string) => {
    event.preventDefault()
    const source = draggedTierKey.get()
    dragEnd()
    if (source && source !== tierKey) void catalog.reorderTier(source, tierKey)
  }

  const selectTier = (tier: EventTicketTier) => {
    showNewTier.set(false)
    catalog.selectTier(tier)
    priceEuro.set(adminEuroFromCents(tier.priceCents))
    feeEuro.set(adminEuroFromCents(tier.feeCents))
    validationMessage.set("")
  }

  const dateValue = (field: "startsAt" | "doorsAt" | "endsAt") => adminDateTimeLocalFromIso(catalog.tierDraft()[field])

  const dateChange = (field: "startsAt" | "doorsAt" | "endsAt", value: string) => {
    const isoValue = adminDateTimeIsoFromLocal(value)
    if (isoValue === null) {
      validationMessage.set("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      catalog.tierFieldChange(field, "")
      return
    }
    validationMessage.set("")
    catalog.tierFieldChange(field, isoValue)
  }

  const addDoorsAt = () =>
    catalog.tierFieldChange("additionalDoorsAt", [
      ...catalog.tierDraft().additionalDoorsAt,
      { startsAt: "", endsAt: "" },
    ])

  const additionalDoorsAtChange = (index: number, value: string) => {
    const isoValue = adminDateTimeIsoFromLocal(value)
    const ranges = catalog.tierDraft().additionalDoorsAt
    if (isoValue === null) {
      validationMessage.set("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      catalog.tierFieldChange(
        "additionalDoorsAt",
        ranges.map((entry, entryIndex) => (entryIndex === index ? { ...entry, startsAt: "" } : entry)),
      )
      return
    }
    validationMessage.set("")
    catalog.tierFieldChange(
      "additionalDoorsAt",
      ranges.map((entry, entryIndex) => (entryIndex === index ? { ...entry, startsAt: isoValue } : entry)),
    )
  }

  const additionalDoorsAtEndChange = (index: number, value: string) => {
    const isoValue = adminDateTimeIsoFromLocal(value)
    const ranges = catalog.tierDraft().additionalDoorsAt
    if (isoValue === null) {
      validationMessage.set("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      catalog.tierFieldChange(
        "additionalDoorsAt",
        ranges.map((entry, entryIndex) => (entryIndex === index ? { ...entry, endsAt: "" } : entry)),
      )
      return
    }
    validationMessage.set("")
    catalog.tierFieldChange(
      "additionalDoorsAt",
      ranges.map((entry, entryIndex) => (entryIndex === index ? { ...entry, endsAt: isoValue } : entry)),
    )
  }

  const removeDoorsAt = (index: number) => {
    catalog.tierFieldChange(
      "additionalDoorsAt",
      catalog.tierDraft().additionalDoorsAt.filter((_, entryIndex) => entryIndex !== index),
    )
    validationMessage.set("")
  }

  const newTier = () => {
    const existingTierKeys = new Set(catalog.selectedEvent()?.tiers.map((tier) => tier.id) ?? [])
    let tierNumber = existingTierKeys.size + 1
    while (existingTierKeys.has(`ticket-${tierNumber}`)) tierNumber += 1

    catalog.tierFieldChange("tierKey", `ticket-${tierNumber}`)
    catalog.tierFieldChange("name", "")
    catalog.tierFieldChange("description", "")
    const event = catalog.selectedEvent()
    catalog.tierFieldChange("startsAt", event?.startsAt ?? "")
    catalog.tierFieldChange("doorsAt", event?.doorsAt ?? "")
    catalog.tierFieldChange("additionalDoorsAt", [])
    catalog.tierFieldChange("endsAt", event?.endsAt ?? "")
    catalog.tierFieldChange("priceCents", "")
    catalog.tierFieldChange("feeCents", "")
    catalog.tierFieldChange("capacity", "")
    catalog.tierFieldChange("maxPerOrder", "10")
    catalog.tierFieldChange("activationCodeRequired", false)
    catalog.tierFieldChange("sortOrder", String((catalog.selectedEvent()?.tiers.length ?? 0) + 1))
    priceEuro.set("")
    feeEuro.set("")
    validationMessage.set("")
  }

  const startNewTier = () => {
    newTier()
    showNewTier.set(true)
  }

  onMount(() => {
    if (!catalog.tierDraft().tierKey) newTier()
    hydrated.set(true)
    const refreshInterval = setInterval(() => {
      void catalog.refreshEvents?.()
    }, 30_000)
    onCleanup(() => clearInterval(refreshInterval))
  })

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    const priceCents = adminEuroToCents(priceEuro.get())
    const feeCents = adminEuroToCents(feeEuro.get())
    if (priceCents === null || feeCents === null) {
      validationMessage.set("Preis und Gebühr brauchen einen Eurobetrag mit höchstens zwei Nachkommastellen.")
      return
    }

    const draft = catalog.tierDraft()
    if (!draft.startsAt.trim() || !draft.endsAt.trim()) {
      validationMessage.set("Beginn und Ende sind erforderlich. Bitte gib beide Zeitpunkte ein.")
      return
    }
    if ([draft.startsAt, draft.endsAt].some((value) => Number.isNaN(Date.parse(value)))) {
      validationMessage.set("Beginn und Ende müssen gültige Datums- und Uhrzeitangaben sein.")
      return
    }
    if (Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)) {
      validationMessage.set("Das Ende muss nach dem Beginn liegen.")
      return
    }
    if (draft.additionalDoorsAt.some((range) => !range.startsAt.trim() || !range.endsAt.trim())) {
      validationMessage.set(
        "Jeder zusätzliche Einlass benötigt Beginn und Ende. Bitte ergänze beide Zeitpunkte oder entferne den Einlass.",
      )
      return
    }
    if (
      draft.additionalDoorsAt.some(
        (range) =>
          Number.isNaN(Date.parse(range.startsAt)) ||
          Number.isNaN(Date.parse(range.endsAt)) ||
          Date.parse(range.endsAt) <= Date.parse(range.startsAt),
      )
    ) {
      validationMessage.set(
        "Jeder zusätzliche Einlass benötigt gültige Zeitpunkte; das Ende muss nach dem Beginn liegen.",
      )
      return
    }

    validationMessage.set("")
    catalog.tierFieldChange("priceCents", String(priceCents))
    catalog.tierFieldChange("feeCents", String(feeCents))
    await catalog.saveTier()
    if (catalog.errorMessage()) {
      validationMessage.set(catalog.errorMessage())
      return
    }
    if (!catalog.errorMessage()) {
      showNewTier.set(false)
      newTier()
    }
  }

  return {
    hydrated: hydrated.get,
    priceEuro,
    feeEuro,
    startsAt: () => dateValue("startsAt"),
    doorsAt: () => dateValue("doorsAt"),
    endsAt: () => dateValue("endsAt"),
    startsAtChange: (value: string) => dateChange("startsAt", value),
    doorsAtChange: (value: string) => dateChange("doorsAt", value),
    additionalDoorsAt: () =>
      catalog.tierDraft().additionalDoorsAt.map((range) => ({
        startsAt: adminDateTimeLocalFromIso(range.startsAt),
        endsAt: adminDateTimeLocalFromIso(range.endsAt),
      })),
    additionalDoorsAtChange,
    additionalDoorsAtEndChange,
    addDoorsAt,
    removeDoorsAt,
    endsAtChange: (value: string) => dateChange("endsAt", value),
    validationMessage: validationMessage.get,
    showNewTier: showNewTier.get,
    dropTargetKey: dropTargetKey.get,
    dragStart,
    dragOver,
    dragEnd,
    drop,
    selectTier,
    newTier,
    startNewTier,
    submit,
  }
}
