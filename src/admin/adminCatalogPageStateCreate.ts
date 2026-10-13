import { createEffect, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { CatalogEventUpsertInput } from "../catalog/client/CatalogEventUpsertInput.ts"
import type { CatalogTicketTierDeleteInput } from "../catalog/client/CatalogTicketTierDeleteInput.ts"
import type { CatalogTicketTierUpsertInput } from "../catalog/client/CatalogTicketTierUpsertInput.ts"
import type { EventItem } from "../events/EventItem.ts"
import type { EventTicketTier } from "../events/EventTicketTier.ts"
import type { EventImageVariants } from "../events/EventImageVariants.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import { eventTicketTierActivationCodeRequiredGet } from "../events/eventTicketTierActivationCodeRequiredGet.ts"
import { eventHighlightsGet } from "../events/eventHighlightsGet.ts"
import { eventInclusionsGet } from "../events/eventInclusionsGet.ts"
import { eventExclusionsGet } from "../events/eventExclusionsGet.ts"
import { eventCategoryLabels } from "../events/eventCategoryLabels.ts"
import type { Result } from "../ui/Result.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import type { AdminEventDraft } from "./AdminEventDraft.ts"
import type { AdminEventItem } from "./AdminEventItem.ts"
import type { AdminTierDraft } from "./AdminTierDraft.ts"
import { catalogAllowedStripePaymentMethodsNormalize } from "../catalog/catalogAllowedStripePaymentMethodsNormalize.ts"

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
  maxPerOrder: "10",
  activationCodeRequired: false,
  sortOrder: "0",
})

export function adminCatalogPageStateCreate(inputs: {
  events: () => readonly AdminEventItem[]
  eventsLive?: () => readonly AdminEventItem[] | undefined
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
  eventDelete?: (input: {
    readonly eventKey: string
  }) => Promise<Result<{ readonly eventKey: string; readonly catalogVersion: number }>>
  categoryHiddenList?: () => Promise<Result<readonly string[]>>
  categoryList?: () => Promise<Result<readonly string[]>>
  categoryHiddenLive?: () => Result<readonly string[]> | undefined
  categoryLive?: () => Result<readonly string[]> | undefined
  categoryCreate?: (input: { readonly category: string }) => Promise<Result<void>>
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
  const categories = createSignalObject<readonly string[]>([])
  const optimisticCategories = new Set<string>()
  createEffect(() => {
    if (!inputs.isServerAuthorized()) {
      events.set([])
      categories.set([])
      hiddenCategories.set([])
      selectedEventKey.set("")
      eventDraft.set(emptyEventDraft())
      tierDraft.set(emptyTierDraft())
      return
    }
    const liveEvents = inputs.eventsLive?.()
    if (liveEvents) events.set(liveEvents)
  })
  createEffect(() => {
    const result = inputs.categoryHiddenLive?.()
    if (result?.success) hiddenCategories.set(result.data)
    if (result && !result.success) errorMessage.set(result.errorMessage)
  })
  createEffect(() => {
    const result = inputs.categoryLive?.()
    if (result?.success) categories.set([...new Set([...result.data, ...optimisticCategories])])
    if (result && !result.success) errorMessage.set(result.errorMessage)
  })
  const isAuthorized = () => inputs.isServerAuthorized()
  const selectedEvent = () =>
    isAuthorized() ? events.get().find((event) => event.id === selectedEventKey.get()) : undefined

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
      startsAt: tier.startsAt ?? selectedEvent()?.startsAt ?? "",
      doorsAt: tier.doorsAt ?? selectedEvent()?.doorsAt ?? "",
      additionalDoorsAt: [...(tier.additionalDoorsAt ?? [])],
      endsAt: tier.endsAt ?? selectedEvent()?.endsAt ?? "",
      priceCents: String(tier.priceCents),
      feeCents: String(tier.feeCents),
      capacity: String(tier.capacity),
      maxPerOrder: String(eventTicketTierMaxPerOrderGet(tier)),
      activationCodeRequired: eventTicketTierActivationCodeRequiredGet(tier),
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
    successMessage.set("")
    if (!inputs.eventUpsert) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    const draft = eventDraft.get()
    if (!draft.eventKey.trim() || !draft.title.trim()) {
      errorMessage.set("Event-Key und Titel sind erforderlich.")
      return
    }
    if (
      [draft.startsAt, draft.endsAt, draft.doorsAt].some((value) => value.trim() && Number.isNaN(Date.parse(value)))
    ) {
      errorMessage.set("Event-Zeitpunkte müssen gültige Datums- und Uhrzeitangaben sein.")
      return
    }
    if (draft.startsAt.trim() && draft.endsAt.trim() && Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)) {
      errorMessage.set("Das Ende muss nach dem Beginn liegen.")
      return
    }
    if (draft.highlights.some((highlight) => !highlight.title.trim())) {
      errorMessage.set("Jedes Highlight benötigt einen Titel.")
      return
    }
    const paymentPolicy = catalogAllowedStripePaymentMethodsNormalize(draft.allowedStripePaymentMethods)
    if (!paymentPolicy.success) {
      errorMessage.set(paymentPolicy.errorMessage)
      return
    }
    isSaving.set(true)
    try {
      const saved = await inputs.eventUpsert({
        ...draft,
        allowedStripePaymentMethods: paymentPolicy.data,
        eventKey: draft.eventKey.trim(),
        highlights: draft.highlights.map((highlight) => ({
          title: highlight.title.trim(),
          description: highlight.description.trim(),
        })),
        inclusions: draft.inclusions.map((item) => item.trim()).filter(Boolean),
        exclusions: draft.exclusions.map((item) => item.trim()).filter(Boolean),
        tags: draft.highlights.map((highlight) => highlight.title.trim()),
        status: draft.status,
      })
      if (!saved.success) {
        errorMessage.set(saved.errorMessage)
        return
      }

      successMessage.set("Event gespeichert. Änderungen werden an den Verkaufskatalog synchronisiert.")
      errorMessage.set("")
      if (!inputs.eventsLive) {
        const refreshedEvents = await reloadEvents()
        if (!refreshedEvents) {
          successMessage.set("Event gespeichert, aber die Eventliste konnte nicht aktualisiert werden.")
          return saved.data.eventKey
        }
        const updated = refreshedEvents.find((event) => event.id === saved.data.eventKey)
        if (updated) {
          selectedEventKey.set(updated.id)
          eventDraft.set(eventToDraft(updated))
        }
      }
      selectedEventKey.set(saved.data.eventKey)
      return saved.data.eventKey
    } catch (error) {
      errorMessage.set(
        `Event konnte nicht gespeichert werden: ${error instanceof Error ? error.message : String(error)}`,
      )
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
    if (!draft.startsAt.trim() || !draft.endsAt.trim()) {
      errorMessage.set("Beginn und Ende sind erforderlich. Bitte gib beide Zeitpunkte ein.")
      return
    }
    if ([draft.startsAt, draft.endsAt].some((value) => Number.isNaN(Date.parse(value)))) {
      errorMessage.set("Beginn und Ende müssen gültige Datums- und Uhrzeitangaben sein.")
      return
    }
    if (Date.parse(draft.endsAt) <= Date.parse(draft.startsAt)) {
      errorMessage.set("Das Ende muss nach dem Beginn liegen.")
      return
    }
    if (
      draft.additionalDoorsAt.some(
        (range) =>
          !range.startsAt.trim() ||
          !range.endsAt.trim() ||
          Number.isNaN(Date.parse(range.startsAt)) ||
          Number.isNaN(Date.parse(range.endsAt)) ||
          Date.parse(range.endsAt) <= Date.parse(range.startsAt),
      )
    ) {
      errorMessage.set("Jeder zusätzliche Einlass benötigt einen gültigen Beginn und ein späteres Ende.")
      return
    }
    const priceCents = nonNegativeIntegerParse(draft.priceCents)
    const feeCents = nonNegativeIntegerParse(draft.feeCents)
    const capacity = nonNegativeIntegerParse(draft.capacity)
    const maxPerOrder =
      draft.maxPerOrder.trim() === "" ? eventTicketTierMaxPerOrderGet({}) : positiveIntegerParse(draft.maxPerOrder)
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
    if (maxPerOrder === null) {
      errorMessage.set("Die Höchstmenge je Bestellung muss eine ganze Zahl ab 1 sein.")
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
        startsAt: draft.startsAt,
        doorsAt: draft.doorsAt.trim() || draft.startsAt,
        additionalDoorsAt: draft.additionalDoorsAt,
        endsAt: draft.endsAt,
        priceCents,
        feeCents,
        capacity,
        maxPerOrder,
        activationCodeRequired: draft.activationCodeRequired,
        sortOrder,
      })
      if (!saved.success) {
        errorMessage.set(saved.errorMessage)
        return
      }

      if (!inputs.eventsLive && !(await reloadEvents())) return
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

  const reorderTier = async (tierKey: string, targetKey: string) => {
    const event = selectedEvent()
    if (!event || !inputs.ticketTierUpsert || isSaving.get()) return
    const tiers = [...event.tiers]
    const from = tiers.findIndex((tier) => tier.id === tierKey)
    const to = tiers.findIndex((tier) => tier.id === targetKey)
    if (from < 0 || to < 0 || from === to) return

    const [moved] = tiers.splice(from, 1)
    if (!moved) return
    tiers.splice(to, 0, moved)
    const tiersWithEventTimes = tiers.map((tier) => ({
      ...tier,
      startsAt: tier.startsAt ?? event.startsAt,
      endsAt: tier.endsAt ?? event.endsAt,
    }))
    if (tiersWithEventTimes.some((tier) => !tier.startsAt.trim() || !tier.endsAt.trim())) {
      errorMessage.set("Beginn und Ende sind erforderlich. Bitte gib beide Zeitpunkte ein.")
      return
    }
    if (
      tiersWithEventTimes.some((tier) => [tier.startsAt, tier.endsAt].some((value) => Number.isNaN(Date.parse(value))))
    ) {
      errorMessage.set("Beginn und Ende müssen gültige Datums- und Uhrzeitangaben sein.")
      return
    }
    if (tiersWithEventTimes.some((tier) => Date.parse(tier.endsAt) <= Date.parse(tier.startsAt))) {
      errorMessage.set("Das Ende muss nach dem Beginn liegen.")
      return
    }
    if (
      tiersWithEventTimes.some((tier) =>
        tier.additionalDoorsAt?.some(
          (range) =>
            !range.startsAt.trim() ||
            !range.endsAt.trim() ||
            Number.isNaN(Date.parse(range.startsAt)) ||
            Number.isNaN(Date.parse(range.endsAt)) ||
            Date.parse(range.endsAt) <= Date.parse(range.startsAt),
        ),
      )
    ) {
      errorMessage.set("Jeder zusätzliche Einlass benötigt einen gültigen Beginn und ein späteres Ende.")
      return
    }
    isSaving.set(true)
    errorMessage.set("")
    successMessage.set("")
    events.set(events.get().map((item) => (item.id === event.id ? { ...item, tiers } : item)))
    try {
      for (const [index, tier] of tiersWithEventTimes.entries()) {
        if (tier.sortOrder === index + 1) continue
        const saved = await inputs.ticketTierUpsert({
          eventKey: event.id,
          tierKey: tier.id,
          name: tier.name,
          description: tier.description,
          startsAt: tier.startsAt,
          doorsAt: tier.doorsAt?.trim() || event.doorsAt?.trim() || tier.startsAt,
          additionalDoorsAt: tier.additionalDoorsAt ?? [],
          endsAt: tier.endsAt,
          priceCents: tier.priceCents,
          feeCents: tier.feeCents,
          capacity: tier.capacity,
          maxPerOrder: eventTicketTierMaxPerOrderGet(tier),
          activationCodeRequired: eventTicketTierActivationCodeRequiredGet(tier),
          sortOrder: index + 1,
        })
        if (!saved.success) {
          errorMessage.set(saved.errorMessage)
          return
        }
      }
      successMessage.set("Reihenfolge der Ticketprodukte gespeichert.")
    } catch {
      errorMessage.set("Die Reihenfolge der Ticketprodukte konnte nicht gespeichert werden.")
    } finally {
      const message = errorMessage.get()
      await reloadEvents()
      if (message) errorMessage.set(message)
      const selected = selectedEvent()?.tiers.find((tier) => tier.id === tierDraft.get().tierKey)
      if (selected) tierDraft.set({ ...tierDraft.get(), sortOrder: String(selected.sortOrder ?? 0) })
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

      if (!inputs.eventsLive && !(await reloadEvents())) return
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
    successMessage.set("")
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
        successMessage.set("")
        errorMessage.set(published.errorMessage)
        return
      }
      if (!inputs.eventsLive) {
        const refreshedEvents = await reloadEvents()
        if (!refreshedEvents) {
          successMessage.set("")
          return
        }
        const event = refreshedEvents.find((candidate) => candidate.id === published.data.eventKey)
        if (!event) {
          successMessage.set("")
          errorMessage.set("Das veröffentlichte Event konnte nicht erneut geladen werden.")
          return
        }
        selectedEventKey.set(event.id)
        eventDraft.set(eventToDraft(event))
      } else {
        selectedEventKey.set(published.data.eventKey)
        eventDraft.set({ ...eventDraft.get(), status: "published" })
      }
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

  const deleteEvent = async (eventKey: string) => {
    if (!inputs.eventDelete || isSaving.get()) return
    isSaving.set(true)
    try {
      const deleted = await inputs.eventDelete({ eventKey })
      if (!deleted.success) {
        errorMessage.set(deleted.errorMessage)
        successMessage.set("")
        return
      }
      events.set(events.get().filter((event) => event.id !== eventKey))
      if (selectedEventKey.get() === eventKey) startNewEvent()
      successMessage.set("Event gelöscht. Bestehende Bestellungen und Tickets bleiben erhalten.")
      errorMessage.set("")
    } catch {
      errorMessage.set("Event konnte nicht gelöscht werden.")
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

  const categoriesLoad = async () => {
    if (!inputs.categoryList) return
    const result = await inputs.categoryList()
    if (!result.success) return errorMessage.set(result.errorMessage)
    categories.set([...new Set([...result.data, ...optimisticCategories])])
  }

  const createCategory = async (category: string): Promise<boolean> => {
    if (!inputs.categoryCreate) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return false
    }
    try {
      const result = await inputs.categoryCreate({ category })
      if (!result.success) {
        errorMessage.set(result.errorMessage)
        return false
      }
      optimisticCategories.add(category)
      categories.set([...new Set([...categories.get(), category])])
      hiddenCategories.set(hiddenCategories.get().filter((hidden) => hidden !== category))
      errorMessage.set("")
      return true
    } catch {
      errorMessage.set("Kategorie konnte nicht hinzugefügt werden.")
      return false
    }
  }

  const hideCategory = async (category: string) => {
    if (!inputs.categoryHide) {
      errorMessage.set("Für die Katalogverwaltung ist eine gültige Admin-Sitzung erforderlich.")
      return
    }
    try {
      const result = await inputs.categoryHide({ category })
      if (!result.success) {
        errorMessage.set(result.errorMessage)
        return
      }
      const hidden = [...new Set([...hiddenCategories.get(), category])]
      hiddenCategories.set(hidden)
      if (eventDraft.get().category === category) {
        const replacement = [
          ...Object.keys(eventCategoryLabels),
          ...categories.get(),
          ...events.get().map((event) => event.category),
        ].find((candidate) => !hidden.includes(candidate))
        eventFieldChange("category", replacement ?? "")
      }
      errorMessage.set("")
    } catch {
      errorMessage.set("Kategorie konnte nicht entfernt werden.")
    }
  }

  onMount(() => {
    if (!inputs.categoryHiddenLive) void hiddenCategoriesLoad()
    if (!inputs.categoryLive) void categoriesLoad()
  })

  return {
    events: () => (isAuthorized() ? events.get() : []),
    hiddenCategories: () => (isAuthorized() ? hiddenCategories.get() : []),
    categories: () => (isAuthorized() ? categories.get() : []),
    selectedEvent: selectedEvent,
    selectedEventKey: () => (isAuthorized() ? selectedEventKey.get() : ""),
    eventDraft: () => (isAuthorized() ? eventDraft.get() : emptyEventDraft()),
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
    reorderTier,
    deleteTier,
    refreshEvents: async () => {
      if (!isSaving.get()) await reloadEvents()
    },
    publishEvent,
    deleteEvent,
    hideCategory,
    createCategory,
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
    allowedStripePaymentMethods: event.allowedStripePaymentMethods?.length
      ? [...event.allowedStripePaymentMethods]
      : undefined,
    highlights: [...eventHighlightsGet(event)],
    inclusions: [...eventInclusionsGet(event)],
    exclusions: [...eventExclusionsGet(event)],
    status: event.status,
  }
}

function nonNegativeIntegerParse(value: string): number | null {
  if (!/^\d+$/u.test(value.trim())) return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) ? parsed : null
}

function positiveIntegerParse(value: string): number | null {
  const parsed = nonNegativeIntegerParse(value)
  if (parsed === null || parsed < 1) return null
  return parsed
}
