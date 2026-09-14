import { createMemo, onMount } from "solid-js"
import { userRoleIsDevOrAdmin } from "../auth/model_field/userRole.ts"
import { userSessionSignal, userTokenGet } from "#src/auth/ui/signals/userSessionSignal.ts"
import { userSessionBrowserRestore } from "#src/auth/ui/signals/userSessionBrowserRestore.ts"
import { catalogEventPublish } from "../catalog/client/catalogEventPublish.ts"
import { catalogEventUpsert } from "../catalog/client/catalogEventUpsert.ts"
import { catalogTicketTierUpsert } from "../catalog/client/catalogTicketTierUpsert.ts"
import type { EventCategory } from "../events/EventCategory.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

type AdminEventDraft = {
  eventKey: string
  title: string
  subtitle: string
  description: string
  category: EventCategory
  startsAt: string
  endsAt: string
  doorsAt: string
  venue: string
  city: string
  address: string
  organizer: string
  imageUrl: string
  imageAlt: string
  tags: string
  status: "draft" | "published" | "archived"
}

type AdminTierDraft = {
  tierKey: string
  name: string
  description: string
  priceCents: string
  feeCents: string
  capacity: string
  sortOrder: string
}

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

export function adminCatalogPageStateCreate(inputs: {
  events: () => readonly EventItem[]
  isServerAuthorized: () => boolean
}) {
  const events = createSignalObject<readonly EventItem[]>(inputs.events())
  const selectedEventKey = createSignalObject("")
  const eventDraft = createSignalObject<AdminEventDraft>(emptyEventDraft())
  const tierDraft = createSignalObject<AdminTierDraft>(emptyTierDraft())
  const errorMessage = createSignalObject("")
  const successMessage = createSignalObject("")
  const isSaving = createSignalObject(false)
  const authenticatedSession = createSignalObject(userSessionSignal.get())
  onMount(() => {
    userSessionBrowserRestore()
    authenticatedSession.set(userSessionSignal.get())
  })

  const isAuthorized = createMemo(() => {
    if (inputs.isServerAuthorized()) return true
    const session = authenticatedSession.get()
    return session !== null && userRoleIsDevOrAdmin(session.profile.role)
  })
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
    const token = userTokenGet()
    if (!token) return errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
    const draft = eventDraft.get()
    if (!draft.eventKey.trim() || !draft.title.trim()) return errorMessage.set("Event-Key und Titel sind erforderlich.")
    isSaving.set(true)
    const saved = await catalogEventUpsert({
      ...draft,
      eventKey: draft.eventKey.trim(),
      tags: splitTags(draft.tags),
      token,
    })
    isSaving.set(false)
    if (!saved.success) return errorMessage.set(saved.errorMessage)

    const previous = events.get().find((event) => event.id === draft.eventKey)
    const updated: EventItem = {
      ...(previous ?? emptyEventAsItem(draft)),
      ...draft,
      id: draft.eventKey,
      catalogVersion: saved.data.catalogVersion,
      tags: splitTags(draft.tags),
      tiers: previous?.tiers ?? [],
      soldOut: previous?.soldOut ?? false,
    }
    events.set([updated, ...events.get().filter((event) => event.id !== updated.id)])
    selectedEventKey.set(updated.id)
    eventDraft.set(eventToDraft(updated))
    successMessage.set("Event gespeichert. Änderungen werden an den Verkaufskatalog synchronisiert.")
    errorMessage.set("")
  }

  const saveTier = async () => {
    const token = userTokenGet()
    const eventKey = eventDraft.get().eventKey.trim()
    const draft = tierDraft.get()
    if (!token) return errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
    if (!eventKey || !draft.tierKey.trim() || !draft.name.trim())
      return errorMessage.set("Event-Key, Tier-Key und Name sind erforderlich.")
    const priceCents = nonNegativeIntegerParse(draft.priceCents)
    const feeCents = nonNegativeIntegerParse(draft.feeCents)
    const capacity = nonNegativeIntegerParse(draft.capacity)
    const sortOrder = nonNegativeIntegerParse(draft.sortOrder)
    if (priceCents === null) return errorMessage.set("Der Preis muss eine ganze Zahl ab 0 sein.")
    if (feeCents === null) return errorMessage.set("Die Gebühr muss eine ganze Zahl ab 0 sein.")
    if (capacity === null) return errorMessage.set("Die Kapazität ist erforderlich und muss eine ganze Zahl ab 0 sein.")
    if (sortOrder === null) return errorMessage.set("Die Sortierung muss eine ganze Zahl ab 0 sein.")

    isSaving.set(true)
    const saved = await catalogTicketTierUpsert({
      eventKey,
      tierKey: draft.tierKey.trim(),
      name: draft.name.trim(),
      description: draft.description.trim(),
      priceCents,
      feeCents,
      capacity,
      sortOrder,
      token,
    })
    isSaving.set(false)
    if (!saved.success) return errorMessage.set(saved.errorMessage)

    const event = events.get().find((candidate) => candidate.id === eventKey)
    if (event) {
      const existingTier = event.tiers.find((tier) => tier.id === draft.tierKey)
      const nextTier = {
        id: draft.tierKey,
        name: draft.name.trim(),
        description: draft.description.trim(),
        priceCents,
        feeCents,
        capacity,
        available: existingTier?.available ?? capacity,
      }
      const updated = {
        ...event,
        catalogVersion: saved.data.catalogVersion,
        tiers: [nextTier, ...event.tiers.filter((tier) => tier.id !== nextTier.id)],
      }
      events.set([updated, ...events.get().filter((candidate) => candidate.id !== eventKey)])
    }
    tierDraft.set(emptyTierDraft())
    successMessage.set("Ticketprodukt gespeichert. Der Bestand bleibt serverseitig maßgeblich.")
    errorMessage.set("")
  }

  const publishEvent = async () => {
    const token = userTokenGet()
    const eventKey = eventDraft.get().eventKey.trim()
    if (!token) return errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
    if (!eventKey) return errorMessage.set("Bitte wähle zuerst ein Event.")
    isSaving.set(true)
    const published = await catalogEventPublish({ eventKey, token })
    isSaving.set(false)
    if (!published.success) return errorMessage.set(published.errorMessage)
    const event = events.get().find((candidate) => candidate.id === eventKey)
    if (event)
      events.set([
        { ...event, catalogVersion: published.data.catalogVersion },
        ...events.get().filter((candidate) => candidate.id !== eventKey),
      ])
    eventFieldChange("status", "published")
    successMessage.set("Event veröffentlicht. Der öffentliche Katalog wird innerhalb des Cache-Fensters aktualisiert.")
    errorMessage.set("")
  }

  return {
    events: events.get,
    selectedEvent: selectedEvent,
    selectedEventKey: selectedEventKey.get,
    eventDraft: eventDraft.get,
    tierDraft: tierDraft.get,
    isAuthorized,
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
