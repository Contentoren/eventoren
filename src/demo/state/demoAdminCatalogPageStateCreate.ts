import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminCatalogPageState } from "../../admin/AdminCatalogPageState.ts"
import type { AdminEventDraft } from "../../admin/AdminEventDraft.ts"
import type { AdminTierDraft } from "../../admin/AdminTierDraft.ts"
import type { EventItem } from "../../events/EventItem.ts"
import type { EventTicketTier } from "../../events/EventTicketTier.ts"

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
  tags: "",
  status: "draft",
})

const emptyTierDraft = (): AdminTierDraft => ({
  tierKey: "",
  name: "",
  description: "",
  priceCents: "",
  feeCents: "",
  capacity: "",
  sortOrder: "0",
})

export function demoAdminCatalogPageStateCreate(inputs: {
  events: readonly EventItem[]
  authorized?: boolean
}): AdminCatalogPageState {
  const events = createSignalObject<readonly EventItem[]>(inputs.events)
  const selectedEventKey = createSignalObject("")
  const eventDraft = createSignalObject<AdminEventDraft>(emptyEventDraft())
  const tierDraft = createSignalObject<AdminTierDraft>(emptyTierDraft())
  const errorMessage = createSignalObject("")
  const successMessage = createSignalObject("")
  const isSaving = createSignalObject(false)
  const selectedEvent = createMemo(() => events.get().find((event) => event.id === selectedEventKey.get()))

  const selectEvent = (event: EventItem) => {
    selectedEventKey.set(event.id)
    eventDraft.set(eventToDraft(event))
    tierDraft.set(emptyTierDraft())
    errorMessage.set("")
    successMessage.set("")
  }

  const startNewEvent = () => {
    selectedEventKey.set("")
    eventDraft.set(emptyEventDraft())
    tierDraft.set(emptyTierDraft())
    errorMessage.set("")
    successMessage.set("")
  }

  const eventFieldChange = <K extends keyof AdminEventDraft>(field: K, value: AdminEventDraft[K]) => {
    eventDraft.set({ ...eventDraft.get(), [field]: value })
    errorMessage.set("")
  }

  const tierFieldChange = <K extends keyof AdminTierDraft>(field: K, value: AdminTierDraft[K]) => {
    tierDraft.set({ ...tierDraft.get(), [field]: value })
    errorMessage.set("")
  }

  const selectTier = (tier: EventTicketTier) => {
    tierDraft.set({
      tierKey: tier.id,
      name: tier.name,
      description: tier.description,
      priceCents: String(tier.priceCents),
      feeCents: String(tier.feeCents),
      capacity: String(tier.capacity),
      sortOrder: "0",
    })
    errorMessage.set("")
    successMessage.set("")
  }

  const saveEvent = async () => {
    const draft = eventDraft.get()
    if (!draft.eventKey.trim() || !draft.title.trim()) {
      errorMessage.set("Event-Key und Titel sind erforderlich.")
      return
    }
    isSaving.set(true)
    const previous = events.get().find((event) => event.id === draft.eventKey)
    const updated: EventItem = {
      ...(previous ?? emptyEventAsItem(draft)),
      ...draft,
      id: draft.eventKey.trim(),
      catalogVersion: (previous?.catalogVersion ?? 0) + 1,
      tags: splitTags(draft.tags),
      tiers: previous?.tiers ?? [],
      soldOut: previous?.soldOut ?? false,
    }
    events.set([updated, ...events.get().filter((event) => event.id !== updated.id)])
    selectedEventKey.set(updated.id)
    eventDraft.set(eventToDraft(updated))
    isSaving.set(false)
    successMessage.set("Event lokal gespeichert. Die Demo-Daten wurden aktualisiert.")
    errorMessage.set("")
  }

  const saveTier = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    const draft = tierDraft.get()
    if (!eventKey || !draft.tierKey.trim() || !draft.name.trim()) {
      errorMessage.set("Event-Key, Tier-Key und Name sind erforderlich.")
      return
    }
    const priceCents = nonNegativeIntegerParse(draft.priceCents)
    const feeCents = nonNegativeIntegerParse(draft.feeCents)
    const capacity = nonNegativeIntegerParse(draft.capacity)
    if (priceCents === null || feeCents === null || capacity === null) {
      errorMessage.set("Preis, Gebühr und Kapazität müssen ganze Zahlen ab 0 sein.")
      return
    }
    isSaving.set(true)
    const event = events.get().find((candidate) => candidate.id === eventKey)
    if (event) {
      const existingTier = event.tiers.find((tier) => tier.id === draft.tierKey)
      const nextTier: EventTicketTier = {
        id: draft.tierKey.trim(),
        name: draft.name.trim(),
        description: draft.description.trim(),
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
      events.set([updated, ...events.get().filter((candidate) => candidate.id !== eventKey)])
    }
    tierDraft.set(emptyTierDraft())
    isSaving.set(false)
    successMessage.set("Ticketprodukt lokal gespeichert. Bestand und Preise gelten nur in dieser Demo.")
    errorMessage.set("")
  }

  const publishEvent = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    if (!eventKey) {
      errorMessage.set("Bitte wähle zuerst ein Event.")
      return
    }
    eventFieldChange("status", "published")
    const event = events.get().find((candidate) => candidate.id === eventKey)
    if (event)
      events.set([
        { ...event, catalogVersion: event.catalogVersion + 1 },
        ...events.get().filter((candidate) => candidate.id !== eventKey),
      ])
    successMessage.set("Event veröffentlicht. Diese Änderung bleibt lokal in der Demo.")
  }

  const firstEvent = inputs.events[0]
  if (firstEvent) selectEvent(firstEvent)

  return {
    events: events.get,
    selectedEvent,
    selectedEventKey: selectedEventKey.get,
    eventDraft: eventDraft.get,
    tierDraft: tierDraft.get,
    isAuthorized: () => inputs.authorized ?? true,
    errorMessage: errorMessage.get,
    successMessage: successMessage.get,
    isSaving: isSaving.get,
    selectEvent,
    startNewEvent,
    eventFieldChange,
    tierFieldChange,
    selectTier,
    saveEvent,
    saveTier,
    publishEvent,
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
    tags: event.tags.join(", "),
    status: "published",
  }
}

function emptyEventAsItem(draft: AdminEventDraft): EventItem {
  return {
    ...draft,
    id: draft.eventKey,
    catalogVersion: 0,
    tags: splitTags(draft.tags),
    tiers: [],
    soldOut: false,
  }
}

function splitTags(value: string): string[] {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0)
}

function nonNegativeIntegerParse(value: string): number | null {
  if (!/^\d+$/u.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}
