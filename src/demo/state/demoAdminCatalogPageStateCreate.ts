import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminCatalogPageState } from "../../admin/AdminCatalogPageState.ts"
import type { AdminEventDraft } from "../../admin/AdminEventDraft.ts"
import type { AdminTierDraft } from "../../admin/AdminTierDraft.ts"
import type { EventItem } from "../../events/EventItem.ts"
import type { EventTicketTier } from "../../events/EventTicketTier.ts"
import { eventHighlightsGet } from "../../events/eventHighlightsGet.ts"
import { eventInclusionsGet } from "../../events/eventInclusionsGet.ts"
import { eventExclusionsGet } from "../../events/eventExclusionsGet.ts"

import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

const emptyEventDraft = (): AdminEventDraft => ({
  eventKey: "",
  title: "",
  subtitle: "",
  description: "",
  category: "konzerte",
  startsAt: "",
  endsAt: "",
  doorsAt: "",
  venue: "",
  city: "",
  address: "",
  organizer: "",
  imageUrl: "",
  imageAlt: "",
  highlights: [],
  inclusions: [],
  exclusions: [],
  status: "draft",
})

const emptyTierDraft = (): AdminTierDraft => ({
  tierKey: "",
  name: "",
  description: "",
  startsAt: "",
  doorsAt: "",
  additionalDoorsAt: [],
  endsAt: "",
  priceCents: "",
  feeCents: "",
  capacity: "",
  sortOrder: "0",
})

export function demoAdminCatalogPageStateCreate(inputs: {
  events: readonly EventItem[]
  authorized?: boolean
  flow?: DemoFlowContextValue
}): AdminCatalogPageState {
  const flow = inputs.flow ?? demoFlowContextUse()
  const firstEvent = inputs.events[0]
  const baseEvents = createSignalObject<readonly EventItem[]>(inputs.events)
  const selectedEventKey = createSignalObject(firstEvent?.id ?? "")
  const eventDraft = createSignalObject<AdminEventDraft>(firstEvent ? eventToDraft(firstEvent) : emptyEventDraft())
  const eventDraftRevision = createSignalObject(0)
  const tierDraft = createSignalObject<AdminTierDraft>(emptyTierDraft())
  const baseErrorMessage = createSignalObject("")
  const successMessage = createSignalObject("")
  const isSaving = createSignalObject(false)
  const hiddenCategories = createSignalObject<readonly string[]>([])

  const hasFlow = () => flow.hasFlowStates()
  const isLoading = () => (hasFlow() ? flow.isLoading() : false)
  const isError = () => (hasFlow() ? flow.isError() : false)
  const isEmpty = () => (hasFlow() ? flow.isEmpty() : false)

  const events = () => {
    if (isLoading() || isError() || isEmpty()) return []
    return baseEvents.get()
  }

  const errorMessage = () => {
    if (isError()) return "Der Eventkatalog konnte nicht geladen werden."
    return baseErrorMessage.get()
  }

  const selectedEvent = createMemo(() => events().find((event) => event.id === selectedEventKey.get()))

  const selectEvent = (event: EventItem) => {
    selectedEventKey.set(event.id)
    eventDraftRevision.set(eventDraftRevision.get() + 1)
    eventDraft.set(eventToDraft(event))
    tierDraft.set(emptyTierDraft())
    baseErrorMessage.set("")
    successMessage.set("")
  }

  const startNewEvent = () => {
    selectedEventKey.set("")
    eventDraftRevision.set(eventDraftRevision.get() + 1)
    eventDraft.set(emptyEventDraft())
    tierDraft.set(emptyTierDraft())
    baseErrorMessage.set("")
    successMessage.set("")
  }

  const eventFieldChange = <K extends keyof AdminEventDraft>(field: K, value: AdminEventDraft[K]) => {
    eventDraft.set({ ...eventDraft.get(), [field]: value })
    baseErrorMessage.set("")
  }

  const tierFieldChange = <K extends keyof AdminTierDraft>(field: K, value: AdminTierDraft[K]) => {
    tierDraft.set({ ...tierDraft.get(), [field]: value })
    baseErrorMessage.set("")
  }

  const selectTier = (tier: EventTicketTier) => {
    tierDraft.set({
      tierKey: tier.id,
      name: tier.name,
      description: tier.description,
      startsAt: tier.startsAt ?? selectedEvent()?.startsAt ?? "",
      doorsAt: tier.doorsAt ?? selectedEvent()?.doorsAt ?? "",
      additionalDoorsAt: [...(tier.additionalDoorsAt ?? [])],
      endsAt: tier.endsAt ?? selectedEvent()?.endsAt ?? "",
      priceCents: String(tier.priceCents),
      feeCents: String(tier.feeCents),
      capacity: String(tier.capacity),
      sortOrder: String(tier.sortOrder ?? 0),
    })
    baseErrorMessage.set("")
    successMessage.set("")
  }

  const saveEvent = async () => {
    const draft = eventDraft.get()
    if (!draft.eventKey.trim() || !draft.title.trim()) {
      baseErrorMessage.set("Event-Key und Titel sind erforderlich.")
      return
    }
    if (draft.highlights.some((highlight) => !highlight.title.trim())) {
      baseErrorMessage.set("Jedes Highlight benötigt einen Titel.")
      return
    }
    isSaving.set(true)
    const previous = baseEvents.get().find((event) => event.id === draft.eventKey)
    const updated: EventItem = {
      ...(previous ?? emptyEventAsItem(draft)),
      ...draft,
      id: draft.eventKey.trim(),
      catalogVersion: (previous?.catalogVersion ?? 0) + 1,
      highlights: draft.highlights.map((highlight) => ({
        title: highlight.title.trim(),
        description: highlight.description.trim(),
      })),
      inclusions: draft.inclusions.map((item) => item.trim()).filter(Boolean),
      exclusions: draft.exclusions.map((item) => item.trim()).filter(Boolean),
      tags: draft.highlights.map((highlight) => highlight.title.trim()),
      tiers: previous?.tiers ?? [],
      soldOut: previous?.soldOut ?? false,
    }
    baseEvents.set([updated, ...baseEvents.get().filter((event) => event.id !== updated.id)])
    selectedEventKey.set(updated.id)
    eventDraft.set(eventToDraft(updated))
    isSaving.set(false)
    successMessage.set("Event lokal gespeichert. Die Demo-Daten wurden aktualisiert.")
    baseErrorMessage.set("")
    return updated.id
  }

  const saveTier = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    const draft = tierDraft.get()
    if (!eventKey || !draft.tierKey.trim() || !draft.name.trim()) {
      baseErrorMessage.set("Event-Key, Tier-Key und Name sind erforderlich.")
      return
    }
    if (
      (draft.additionalDoorsAt.length && !draft.doorsAt.trim()) ||
      draft.additionalDoorsAt.some((value) => !value.trim() || Number.isNaN(Date.parse(value)))
    ) {
      baseErrorMessage.set("Bitte gib für jeden Einlass ein gültiges Datum mit Uhrzeit ein.")
      return
    }
    const priceCents = nonNegativeIntegerParse(draft.priceCents)
    const feeCents = nonNegativeIntegerParse(draft.feeCents)
    const capacity = nonNegativeIntegerParse(draft.capacity)
    if (priceCents === null || feeCents === null || capacity === null) {
      baseErrorMessage.set("Preis, Gebühr und Kapazität müssen ganze Zahlen ab 0 sein.")
      return
    }
    isSaving.set(true)
    const event = baseEvents.get().find((candidate) => candidate.id === eventKey)
    if (event) {
      const existingTier = event.tiers.find((tier) => tier.id === draft.tierKey)
      const nextTier: EventTicketTier = {
        id: draft.tierKey.trim(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        startsAt: draft.startsAt,
        doorsAt: draft.doorsAt.trim() || draft.startsAt,
        additionalDoorsAt: [...draft.additionalDoorsAt],
        endsAt: draft.endsAt,
        priceCents,
        feeCents,
        capacity,
        available: Math.min(existingTier?.available ?? capacity, capacity),
      }
      const updated = {
        ...event,
        catalogVersion: event.catalogVersion + 1,
        tiers: [nextTier, ...event.tiers.filter((tier) => tier.id !== nextTier.id)],
      }
      baseEvents.set([updated, ...baseEvents.get().filter((candidate) => candidate.id !== eventKey)])
    }
    tierDraft.set(emptyTierDraft())
    isSaving.set(false)
    successMessage.set("Ticketprodukt lokal gespeichert. Bestand und Preise gelten nur in dieser Demo.")
    baseErrorMessage.set("")
  }

  const deleteTier = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    const tierKey = tierDraft.get().tierKey.trim()
    if (!eventKey || !tierKey) {
      baseErrorMessage.set("Bitte wähle zuerst ein Ticketprodukt.")
      return
    }
    const event = baseEvents.get().find((candidate) => candidate.id === eventKey)
    if (!event) return

    isSaving.set(true)
    baseEvents.set([
      { ...event, catalogVersion: event.catalogVersion + 1, tiers: event.tiers.filter((tier) => tier.id !== tierKey) },
      ...baseEvents.get().filter((candidate) => candidate.id !== eventKey),
    ])
    tierDraft.set(emptyTierDraft())
    isSaving.set(false)
    successMessage.set("Ticketprodukt lokal gelöscht. Diese Änderung bleibt lokal in der Demo.")
    baseErrorMessage.set("")
  }

  const reorderTier = async (tierKey: string, targetKey: string) => {
    const event = selectedEvent()
    if (!event) return
    const tiers = [...event.tiers]
    const from = tiers.findIndex((tier) => tier.id === tierKey)
    const to = tiers.findIndex((tier) => tier.id === targetKey)
    if (from < 0 || to < 0 || from === to) return
    const [moved] = tiers.splice(from, 1)
    if (!moved) return
    tiers.splice(to, 0, moved)
    baseEvents.set(
      baseEvents
        .get()
        .map((item) =>
          item.id === event.id
            ? { ...item, tiers: tiers.map((tier, index) => ({ ...tier, sortOrder: index + 1 })) }
            : item,
        ),
    )
    successMessage.set("Reihenfolge der Ticketprodukte lokal gespeichert.")
  }

  const publishEvent = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    if (!eventKey) {
      baseErrorMessage.set("Bitte wähle zuerst ein Event.")
      return
    }
    eventFieldChange("status", "published")
    const event = baseEvents.get().find((candidate) => candidate.id === eventKey)
    if (event)
      baseEvents.set([
        { ...event, catalogVersion: event.catalogVersion + 1 },
        ...baseEvents.get().filter((candidate) => candidate.id !== eventKey),
      ])
    successMessage.set("Event veröffentlicht. Diese Änderung bleibt lokal in der Demo.")
  }

  const hideCategory = async (category: string) => {
    hiddenCategories.set([...new Set([...hiddenCategories.get(), category])])
  }

  return {
    events,
    hiddenCategories: hiddenCategories.get,
    selectedEvent,
    selectedEventKey: selectedEventKey.get,
    eventDraft: eventDraft.get,
    eventDraftRevision: eventDraftRevision.get,
    tierDraft: tierDraft.get,
    isAuthorized: () => inputs.authorized ?? true,
    isLoading,
    errorMessage,
    successMessage: successMessage.get,
    isSaving: isSaving.get,
    selectEvent,
    startNewEvent,
    eventFieldChange,
    tierFieldChange,
    selectTier,
    saveEvent,
    saveTier,
    reorderTier,
    deleteTier,
    publishEvent,
    deleteEvent: async (eventKey: string) => {
      baseEvents.set(baseEvents.get().filter((event) => event.id !== eventKey))
      if (selectedEventKey.get() === eventKey) startNewEvent()
      successMessage.set("Event lokal gelöscht. Diese Änderung bleibt lokal in der Demo.")
    },
    hideCategory,
  }
}

function eventToDraft(event: EventItem): AdminEventDraft {
  return {
    eventKey: event.id,
    title: event.title,
    subtitle: event.subtitle,
    description: event.description,
    category: event.category,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsAt: event.doorsAt,
    venue: event.venue,
    city: event.city,
    address: event.address,
    organizer: event.organizer,
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    highlights: [...eventHighlightsGet(event)],
    inclusions: [...eventInclusionsGet(event)],
    exclusions: [...eventExclusionsGet(event)],
    status: "published",
  }
}

function emptyEventAsItem(draft: AdminEventDraft): EventItem {
  return {
    ...draft,
    id: draft.eventKey,
    catalogVersion: 0,
    tags: draft.highlights.map((highlight) => highlight.title.trim()),
    tiers: [],
    soldOut: false,
  }
}

function nonNegativeIntegerParse(value: string): number | null {
  if (!/^\d+$/u.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}
