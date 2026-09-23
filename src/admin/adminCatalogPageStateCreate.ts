import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CatalogEventUpsertInput } from "../catalog/client/CatalogEventUpsertInput.ts"
import type { CatalogTicketTierDeleteInput } from "../catalog/client/CatalogTicketTierDeleteInput.ts"
import type { CatalogTicketTierUpsertInput } from "../catalog/client/CatalogTicketTierUpsertInput.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import type { EventImageVariants } from "../events/EventImageVariants.ts"
import type { Result } from "../ui/Result.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import type { AdminEventDraft } from "./AdminEventDraft.ts"
import type { AdminEventItem } from "./AdminEventItem.ts"
import type { AdminTierDraft } from "./AdminTierDraft.ts"

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
  events: () => readonly AdminEventItem[]
  eventsLoadError?: () => string
  isServerAuthorized: () => boolean
  reloadEvents: () => Promise<
    | { readonly success: true; readonly data: readonly AdminEventItem[] }
    | { readonly success: false; readonly errorMessage: string }
  >
  eventUpsert?: (
    input: Omit<CatalogEventUpsertInput, "token">,
  ) => Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>>
  ticketTierDelete?: (
    input: Omit<CatalogTicketTierDeleteInput, "token">,
  ) => Promise<Result<{ readonly tierKey: string; readonly catalogVersion: number }>>
  ticketTierUpsert?: (
    input: Omit<CatalogTicketTierUpsertInput, "token">,
  ) => Promise<Result<{ readonly tierKey: string; readonly catalogVersion: number }>>
  eventPublish?: (input: {
    readonly eventKey: string
  }) => Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>>
  categoryHiddenList?: () => Promise<Result<readonly string[]>>
  categoryHide?: (input: { readonly category: string }) => Promise<Result<void>>
  imageUpload?: (file: File) => Promise<Result<EventImageVariants>>
}): AdminCatalogPageState {
  const events = createSignalObject<readonly AdminEventItem[]>(inputs.events())
  const selectedEventKey = createSignalObject("")
  const eventDraft = createSignalObject<AdminEventDraft>(emptyEventDraft())
  const eventDraftRevision = createSignalObject(0)
  const tierDraft = createSignalObject<AdminTierDraft>(emptyTierDraft())
  const errorMessage = createSignalObject(inputs.eventsLoadError?.() ?? "")
  const successMessage = createSignalObject("")
  const isSaving = createSignalObject(false)
  const hiddenCategories = createSignalObject<readonly string[]>([])
  onMount(() => {
    void hiddenCategoriesLoad()
  })

  const isAuthorized = () => inputs.isServerAuthorized()
  const selectedEvent = () => events.get().find((event) => event.id === selectedEventKey.get())

  const selectEvent = (event: EventItem) => {
    const adminEvent = events.get().find((candidate) => candidate.id === event.id)
    if (!adminEvent) return
    selectedEventKey.set(adminEvent.id)
    eventDraftRevision.set(eventDraftRevision.get() + 1)
    eventDraft.set(eventToDraft(adminEvent))
    tierDraft.set(emptyTierDraft())
    errorMessage.set("")
    successMessage.set("")
  }

  const startNewEvent = () => {
    selectedEventKey.set("")
    eventDraftRevision.set(eventDraftRevision.get() + 1)
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
      sortOrder: String(tier.sortOrder ?? 0),
    })
    errorMessage.set("")
    successMessage.set("")
  }

  const reloadEvents = async (): Promise<readonly AdminEventItem[] | undefined> => {
    let result: Awaited<ReturnType<typeof inputs.reloadEvents>>
    try {
      result = await inputs.reloadEvents()
    } catch {
      errorMessage.set("Admin-Veranstaltungen konnten nicht geladen werden.")
      successMessage.set("")
      return undefined
    }
    if (!result.success) {
      errorMessage.set(result.errorMessage)
      successMessage.set("")
      return undefined
    }
    events.set(result.data)
    return result.data
  }

  const saveEvent = async () => {
    if (!inputs.eventUpsert) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    const draft = eventDraft.get()
    if (!draft.eventKey.trim() || !draft.title.trim()) {
      errorMessage.set("Event-Key und Titel sind erforderlich.")
      return
    }
    isSaving.set(true)
    try {
      const saved = await inputs.eventUpsert({
        ...draft,
        eventKey: draft.eventKey.trim(),
        tags: splitTags(draft.tags),
        status: draft.status === "published" && !selectedEvent()?.tiers.length ? "draft" : draft.status,
      })
      if (!saved.success) {
        errorMessage.set(saved.errorMessage)
        return
      }

      const refreshedEvents = await reloadEvents()
      if (!refreshedEvents) return undefined
      const updated = refreshedEvents.find((event) => event.id === saved.data.eventKey)
      if (!updated) {
        errorMessage.set("Das gespeicherte Event konnte nicht erneut geladen werden.")
        return undefined
      }
      selectedEventKey.set(updated.id)
      eventDraft.set(eventToDraft(updated))
      successMessage.set("Event gespeichert. Änderungen werden an den Verkaufskatalog synchronisiert.")
      errorMessage.set("")
      return updated.id
    } catch {
      errorMessage.set("Event konnte nicht gespeichert werden.")
      successMessage.set("")
      return undefined
    } finally {
      isSaving.set(false)
    }
  }

  const saveTier = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    const draft = tierDraft.get()
    if (!inputs.ticketTierUpsert) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    if (!eventKey || !draft.tierKey.trim() || !draft.name.trim()) {
      errorMessage.set("Event-Key, Tier-Key und Name sind erforderlich.")
      return
    }
    const priceCents = nonNegativeIntegerParse(draft.priceCents)
    const feeCents = nonNegativeIntegerParse(draft.feeCents)
    const capacity = nonNegativeIntegerParse(draft.capacity)
    const sortOrder = nonNegativeIntegerParse(draft.sortOrder)
    if (priceCents === null) {
      errorMessage.set("Der Preis muss eine ganze Zahl ab 0 sein.")
      return
    }
    if (feeCents === null) {
      errorMessage.set("Die Gebühr muss eine ganze Zahl ab 0 sein.")
      return
    }
    if (capacity === null) {
      errorMessage.set("Die Kapazität ist erforderlich und muss eine ganze Zahl ab 0 sein.")
      return
    }
    if (sortOrder === null) {
      errorMessage.set("Die Sortierung muss eine ganze Zahl ab 0 sein.")
      return
    }

    isSaving.set(true)
    try {
      const saved = await inputs.ticketTierUpsert({
        eventKey,
        tierKey: draft.tierKey.trim(),
        name: draft.name.trim(),
        description: draft.description.trim(),
        priceCents,
        feeCents,
        capacity,
        sortOrder,
      })
      if (!saved.success) {
        errorMessage.set(saved.errorMessage)
        return
      }

      if (!(await reloadEvents())) return
      tierDraft.set(emptyTierDraft())
      successMessage.set("Ticketprodukt gespeichert. Der Bestand bleibt serverseitig maßgeblich.")
      errorMessage.set("")
    } catch {
      errorMessage.set("Ticketprodukt konnte nicht gespeichert werden.")
      successMessage.set("")
    } finally {
      isSaving.set(false)
    }
  }

  const deleteTier = async () => {
    const eventKey = eventDraft.get().eventKey.trim()
    const tierKey = tierDraft.get().tierKey.trim()
    if (!inputs.ticketTierDelete) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    if (!eventKey || !tierKey) {
      errorMessage.set("Bitte wähle zuerst ein Ticketprodukt.")
      return
    }

    isSaving.set(true)
    try {
      const deleted = await inputs.ticketTierDelete({ eventKey, tierKey })
      if (!deleted.success) {
        errorMessage.set(deleted.errorMessage)
        return
      }

      if (!(await reloadEvents())) return
      tierDraft.set(emptyTierDraft())
      successMessage.set("Ticketprodukt gelöscht.")
      errorMessage.set("")
    } catch {
      errorMessage.set("Ticketprodukt konnte nicht gelöscht werden.")
      successMessage.set("")
    } finally {
      isSaving.set(false)
    }
  }

  const publishEvent = async () => {
    if (!inputs.eventPublish) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    if (!selectedEventKey.get()) {
      errorMessage.set("Bitte wähle zuerst ein Event.")
      return
    }
    const eventKey = await saveEvent()
    if (!eventKey) return
    isSaving.set(true)
    try {
      const published = await inputs.eventPublish({ eventKey })
      if (!published.success) {
        errorMessage.set(published.errorMessage)
        return
      }
      const refreshedEvents = await reloadEvents()
      if (!refreshedEvents) return
      const event = refreshedEvents.find((candidate) => candidate.id === published.data.eventKey)
      if (!event) {
        errorMessage.set("Das veröffentlichte Event konnte nicht erneut geladen werden.")
        return
      }
      selectedEventKey.set(event.id)
      eventDraft.set(eventToDraft(event))
      successMessage.set(
        "Event veröffentlicht. Der öffentliche Katalog wird innerhalb des Cache-Fensters aktualisiert.",
      )
      errorMessage.set("")
    } catch {
      errorMessage.set("Event konnte nicht veröffentlicht werden.")
      successMessage.set("")
    } finally {
      isSaving.set(false)
    }
  }

  const hiddenCategoriesLoad = async () => {
    if (!inputs.categoryHiddenList) return
    const result = await inputs.categoryHiddenList()
    if (!result.success) return errorMessage.set(result.errorMessage)
    hiddenCategories.set(result.data)
  }

  const hideCategory = async (category: string) => {
    if (!inputs.categoryHide) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    const result = await inputs.categoryHide({ category })
    if (!result.success) {
      errorMessage.set(result.errorMessage)
      return
    }
    hiddenCategories.set([...new Set([...hiddenCategories.get(), category])])
  }

  return {
    events: events.get,
    hiddenCategories: hiddenCategories.get,
    selectedEvent: selectedEvent,
    selectedEventKey: selectedEventKey.get,
    eventDraft: eventDraft.get,
    eventDraftRevision: eventDraftRevision.get,
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
    deleteTier,
    refreshEvents: async () => {
      if (!isSaving.get()) await reloadEvents()
    },
    publishEvent,
    hideCategory,
    imageUpload: inputs.imageUpload,
  }
}

function eventToDraft(event: AdminEventItem): AdminEventDraft {
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
    imageVariants: event.imageVariants,
    imageAlt: event.imageAlt,
    tags: event.tags.join(", "),
    status: event.status,
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
