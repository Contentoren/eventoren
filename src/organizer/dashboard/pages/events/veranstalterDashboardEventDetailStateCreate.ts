import { type Accessor, createMemo, createRenderEffect } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { Result } from "#result"
import { adminEventReleaseDateTimeFromIso } from "#src/admin/adminEventReleaseDateTimeFromIso.ts"
import { adminEventReleaseDateTimeToIso } from "#src/admin/adminEventReleaseDateTimeToIso.ts"
import { type CatalogEventFaqs, catalogEventFaqsSchema } from "#src/catalog/catalogEventFaqsSchema.ts"
import { type CatalogEventSchedule, catalogEventScheduleSchema } from "#src/catalog/catalogEventScheduleSchema.ts"
import { ticketPriceFormat } from "#src/ticketing/ticketPriceFormat.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizerDashboardEventDetail } from "../../events/model/organizerDashboardEventDetailCreate.ts"
import { organizerDashboardEventPatchParse } from "../../events/model/organizerDashboardEventPatchParse.ts"
import type { OrganizerDashboardEventPatch } from "../../events/model/organizerDashboardEventPatchSchema.ts"
import type { OrganizerDashboardTierUpsert } from "../../events/model/organizerDashboardTierUpsertSchema.ts"
import type { VeranstalterDashboardEventDetailConfirm } from "./veranstalterDashboardEventDetailSearchParse.ts"
import { veranstalterDashboardEventMutationsCreate } from "./veranstalterDashboardEventMutationsCreate.ts"
import type { VeranstalterDashboardEventTierForm } from "./veranstalterDashboardEventTierFormValidate.ts"
import {
  veranstalterDashboardEventTierFormEmpty,
  veranstalterDashboardEventTierFormValidate,
} from "./veranstalterDashboardEventTierFormValidate.ts"

type EventPatchDirty = Partial<
  Record<
    | "title"
    | "subtitle"
    | "description"
    | "category"
    | "venue"
    | "city"
    | "address"
    | "organizer"
    | "imageUrl"
    | "imageAlt",
    string
  >
> &
  Partial<Record<"startsAtLocal" | "endsAtLocal" | "doorsAtLocal" | "bookingOpensAtLocal", string>>

const newTierKey = "neu"

const requiredPatchLabels = {
  title: "Veranstaltungstitel",
  category: "Kategorie",
  venue: "Veranstaltungsort",
  city: "Stadt",
} as const

type RequiredPatchKey = keyof typeof requiredPatchLabels

const optionalPatchKeys = ["subtitle", "description", "address", "organizer", "imageUrl", "imageAlt"] as const

/**
 * Thin datasource surface so state tests can inject fakes without SDK mocks.
 * Defaults below wire the live Convex mutations and the live detail query.
 */
export type VeranstalterDashboardEventDetailSources = {
  readonly updateEvent: (
    orgId: string,
    eventKey: string,
    patch: OrganizerDashboardEventPatch,
  ) => Promise<Result<unknown>>
  readonly upsertTier: (
    orgId: string,
    eventKey: string,
    input: OrganizerDashboardTierUpsert & { readonly tierKey?: string },
  ) => Promise<Result<{ readonly tierKey: string }>>
  readonly archiveTier: (
    orgId: string,
    eventKey: string,
    tierKey: string,
  ) => Promise<Result<{ readonly tierKey: string }>>
  readonly publishEvent: (orgId: string, eventKey: string) => Promise<Result<unknown>>
  readonly archiveEvent: (orgId: string, eventKey: string) => Promise<Result<unknown>>
  readonly watchDetail: (
    orgId: () => string | undefined,
    eventKey: () => string | undefined,
  ) => Accessor<Result<OrganizerDashboardEventDetail> | undefined>
}

export function veranstalterDashboardEventDetailStateCreate(inputs: {
  readonly orgId: () => string | undefined
  /** Reactive event key so in-place route changes reload the detail. */
  readonly eventKey: () => string
  readonly tierKey: () => string | undefined
  /** URL-owned archive confirmation dialog state. */
  readonly confirm: () => VeranstalterDashboardEventDetailConfirm | undefined
  readonly canEdit: () => boolean
  readonly canManageTiers: () => boolean
  /** Order/participant discoverability for read/entry roles; defaults to hidden. */
  readonly canReadOrders?: () => boolean
  readonly canReadParticipants?: () => boolean
  /** Admission/box-office discoverability for entry/cash-desk roles; defaults to hidden. */
  readonly canEnter?: () => boolean
  readonly canUseBoxOffice?: () => boolean
  readonly openTier: (tierKey: string) => void
  readonly closeTier: () => void
  readonly openConfirm: (confirm: VeranstalterDashboardEventDetailConfirm) => void
  readonly closeConfirm: () => void
  readonly toList: () => void
  readonly sources?: VeranstalterDashboardEventDetailSources | undefined
}) {
  const sources: VeranstalterDashboardEventDetailSources = inputs.sources ?? {
    ...veranstalterDashboardEventMutationsCreate(),
    watchDetail: (orgId, eventKey) =>
      queryCreate(api.organizerDashboardEvents.organizerDashboardEventGetQuery, () => {
        const currentOrg = orgId()
        const currentKey = eventKey()
        if (!currentOrg || !currentKey) return undefined
        return { orgId: currentOrg as Id<"orgs">, eventKey: currentKey }
      }),
  }

  const detailRaw = sources.watchDetail(inputs.orgId, inputs.eventKey)

  const detail = createMemo((): OrganizerDashboardEventDetail | undefined => {
    const current = detailRaw()
    if (!current?.success) return undefined
    if (current.data.orgId !== inputs.orgId() || current.data.eventKey !== inputs.eventKey()) return undefined
    return current.data
  })

  const detailError = (): string | null => {
    const current = detailRaw()
    if (current && !current.success) return current.errorMessage
    return null
  }

  const dirty = createSignalObject<EventPatchDirty>({})
  const faqDraft = createSignalObject<CatalogEventFaqs | undefined>(undefined)
  const scheduleDraft = createSignalObject<CatalogEventSchedule | undefined>(undefined)
  const faqRows = () => faqDraft.get() ?? detail()?.faqs ?? []
  const scheduleRows = () => scheduleDraft.get() ?? detail()?.schedule ?? []
  const pending = createSignalObject(false)
  const failure = createSignalObject<string | null>(null)
  const tierDraft = createSignalObject<VeranstalterDashboardEventTierForm>(veranstalterDashboardEventTierFormEmpty)

  const patchFieldChange = (field: keyof EventPatchDirty, value: string) => {
    failure.set(null)
    dirty.set({ ...dirty.get(), [field]: value })
  }

  const berlinLocal = (iso: string | undefined): string => (iso ? adminEventReleaseDateTimeFromIso(iso) : "")

  const guardEditable = (): boolean => {
    if (inputs.canEdit()) return true
    failure.set("Keine Berechtigung: Grunddaten sind nur mit Bearbeitungsrecht veränderbar.")
    return false
  }

  let scopeGeneration = 0
  // Only route scope changes reset drafts. Live query updates must not erase local edits.
  // Requests remain in flight, but pending and completion effects belong to one visit.
  createRenderEffect(() => {
    inputs.orgId()
    inputs.eventKey()
    scopeGeneration++
    pending.set(false)
    dirty.set({})
    faqDraft.set(undefined)
    scheduleDraft.set(undefined)
    failure.set(null)
  })

  const contentEditable = () => {
    if (pending.get() || !guardEditable()) return false
    if (detail()?.status === "draft") return true
    failure.set("FAQ und Ablauf sind nur im geladenen Entwurf bearbeitbar.")
    return false
  }
  const faqAdd = () => {
    if (!contentEditable() || faqRows().length >= catalogEventFaqsSchema.pipe[1].requirement) return
    faqDraft.set([...faqRows(), { id: crypto.randomUUID(), question: "", answer: "" }])
  }
  const faqChange = (id: string, field: "question" | "answer", value: string) => {
    if (!contentEditable()) return
    faqDraft.set(faqRows().map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }
  const faqDelete = (id: string) => {
    if (!contentEditable()) return
    faqDraft.set(faqRows().filter((row) => row.id !== id))
  }
  const faqClear = () => {
    if (contentEditable()) faqDraft.set([])
  }
  const scheduleAdd = () => {
    if (!contentEditable() || scheduleRows().length >= catalogEventScheduleSchema.pipe[1].requirement) return
    scheduleDraft.set([...scheduleRows(), { id: crypto.randomUUID(), time: "", title: "", detail: "" }])
  }
  const scheduleChange = (id: string, field: "time" | "title" | "detail", value: string) => {
    if (!contentEditable()) return
    scheduleDraft.set(scheduleRows().map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }
  const scheduleDelete = (id: string) => {
    if (!contentEditable()) return
    scheduleDraft.set(scheduleRows().filter((row) => row.id !== id))
  }
  const scheduleClear = () => {
    if (contentEditable()) scheduleDraft.set([])
  }
  const contentReload = () => {
    if (pending.get()) return
    faqDraft.set(undefined)
    scheduleDraft.set(undefined)
    failure.set(null)
  }

  const guardTiers = (): boolean => {
    if (inputs.canManageTiers()) return true
    failure.set("Keine Berechtigung: Tarife sind nur mit Ticketrecht veränderbar.")
    return false
  }

  /**
   * Sends changed draft fields; Berlin wall time converts to UTC. Optional
   * text fields send even when blank so descriptions can be cleared, while
   * required fields fail validation instead of persisting empty values.
   */
  const patchSave = async () => {
    if (pending.get()) return
    if (!guardEditable()) return
    const changes = dirty.get()
    const keys = Object.keys(changes) as (keyof EventPatchDirty)[]
    if (keys.length === 0 && faqDraft.get() === undefined && scheduleDraft.get() === undefined) {
      failure.set("Keine Änderungen zum Speichern.")
      return
    }
    const patch: Record<string, unknown> = {}
    for (const key of Object.keys(requiredPatchLabels) as RequiredPatchKey[]) {
      const value = changes[key]
      if (value === undefined) continue
      if (value.trim().length === 0) {
        failure.set(`Bitte gib ${requiredPatchLabels[key]} ein.`)
        return
      }
      patch[key] = value.trim()
    }
    for (const key of optionalPatchKeys) {
      const value = changes[key]
      if (value === undefined) continue
      patch[key] = value
    }
    for (const key of ["startsAt", "endsAt", "doorsAt", "bookingOpensAt"] as const) {
      const value = changes[`${key}Local` as keyof EventPatchDirty]
      if (value === undefined || value.trim().length === 0) continue
      const converted = adminEventReleaseDateTimeToIso(value.trim())
      if (!converted.success) {
        failure.set(converted.errorMessage)
        return
      }
      patch[key] = converted.data
    }
    if (faqDraft.get() !== undefined) patch.faqs = faqDraft.get()
    if (scheduleDraft.get() !== undefined) patch.schedule = scheduleDraft.get()
    const eventKey = inputs.eventKey()
    const orgId = inputs.orgId()
    if (!orgId) {
      failure.set("Keine Organisation ausgewählt.")
      return
    }
    const generation = scopeGeneration
    const parsed = await organizerDashboardEventPatchParse(patch)
    if (scopeGeneration !== generation) return
    if (!parsed.success) {
      failure.set(parsed.errorMessage)
      return
    }
    pending.set(true)
    try {
      const updated = await sources.updateEvent(orgId, eventKey, parsed.data)
      if (scopeGeneration !== generation) return
      if (!updated.success) {
        failure.set(updated.errorMessage)
        return
      }
      dirty.set({})
      faqDraft.set(undefined)
      scheduleDraft.set(undefined)
    } finally {
      if (scopeGeneration === generation) pending.set(false)
    }
  }

  const sheetTierKey = (): string | undefined => inputs.tierKey()
  const sheetOpen = (): boolean => sheetTierKey() !== undefined

  const sheetTier = createMemo(() => {
    const key = sheetTierKey()
    if (!key || key === newTierKey) return undefined
    return detail()?.tiers.find((tier) => tier.tierKey === key)
  })

  // Reset immediately for the full dialog scope, including identical tier keys
  // in different events/orgs. Seed only from matching loaded detail; same-scope
  // query updates must never overwrite unsaved edits.
  let seededFor: string | null = null
  let activeTierScope: string | undefined
  let tierGeneration = 0
  createRenderEffect(() => {
    const key = sheetTierKey()
    const scope = JSON.stringify([inputs.orgId(), inputs.eventKey(), key])
    if (scope !== activeTierScope) {
      activeTierScope = scope
      tierGeneration++
      seededFor = null
      tierDraft.set(veranstalterDashboardEventTierFormEmpty)
    }
    if (key === undefined || key === seededFor) return
    if (key === newTierKey) {
      tierDraft.set(veranstalterDashboardEventTierFormEmpty)
      seededFor = key
      return
    }
    const found = sheetTier()
    if (!found) return
    tierDraft.set({
      ...veranstalterDashboardEventTierFormEmpty,
      name: found.name,
      description: found.description,
      priceEuros:
        found.priceCents === undefined
          ? ""
          : (found.priceCents / 100).toLocaleString("de-DE", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            }),
      capacity: String(found.capacity),
    })
    seededFor = key
  })

  const tierFieldChange = (field: keyof VeranstalterDashboardEventTierForm, value: string) => {
    failure.set(null)
    tierDraft.set({ ...tierDraft.get(), [field]: value })
  }

  const tierSave = async () => {
    if (pending.get()) return
    if (!guardTiers()) return
    const validated = veranstalterDashboardEventTierFormValidate(tierDraft.get())
    if (!validated.success) {
      failure.set(validated.errorMessage)
      return
    }
    const orgId = inputs.orgId()
    const key = sheetTierKey()
    if (!orgId || !key) {
      failure.set("Der Tarifdialog ist ohne Auswahl geöffnet.")
      return
    }
    if (!detail() || (key !== newTierKey && !sheetTier())) {
      failure.set("Die Veranstaltung und der ausgewählte Tarif müssen zuerst geladen sein.")
      return
    }
    const generation = scopeGeneration
    const dialogGeneration = tierGeneration
    const eventKey = inputs.eventKey()
    pending.set(true)
    try {
      const saved = await sources.upsertTier(orgId, eventKey, {
        ...(key === newTierKey ? {} : { tierKey: key }),
        ...validated.data,
      })
      if (scopeGeneration !== generation || tierGeneration !== dialogGeneration) return
      if (!saved.success) {
        failure.set(saved.errorMessage)
        return
      }
      seededFor = null
      inputs.closeTier()
    } finally {
      if (scopeGeneration === generation) pending.set(false)
    }
  }

  const requestTierArchive = () => {
    if (!guardTiers()) return
    if (!detail()) {
      failure.set("Die Veranstaltung wird noch geladen.")
      return
    }
    const key = sheetTierKey()
    if (!key || key === newTierKey) return
    inputs.openConfirm("tarif-archiv")
  }

  /** Archive mutations run only after the URL-backed confirmation approves. */
  const confirmTierArchive = async () => {
    if (pending.get()) return
    if (!guardTiers()) return
    const orgId = inputs.orgId()
    const key = sheetTierKey()
    if (!orgId || !key || key === newTierKey) return
    const generation = scopeGeneration
    const dialogGeneration = tierGeneration
    const eventKey = inputs.eventKey()
    pending.set(true)
    try {
      const archived = await sources.archiveTier(orgId, eventKey, key)
      if (scopeGeneration !== generation || tierGeneration !== dialogGeneration) return
      if (!archived.success) {
        failure.set(archived.errorMessage)
        return
      }
      seededFor = null
      inputs.closeConfirm()
      inputs.closeTier()
    } finally {
      if (scopeGeneration === generation) pending.set(false)
    }
  }

  const publish = async () => {
    if (pending.get()) return
    if (!guardEditable()) return
    const orgId = inputs.orgId()
    if (!orgId) return
    const generation = scopeGeneration
    const eventKey = inputs.eventKey()
    pending.set(true)
    try {
      const published = await sources.publishEvent(orgId, eventKey)
      if (scopeGeneration !== generation) return
      if (!published.success) failure.set(published.errorMessage)
    } finally {
      if (scopeGeneration === generation) pending.set(false)
    }
  }

  const requestEventArchive = () => {
    if (!guardEditable()) return
    if (!detail()) {
      failure.set("Die Veranstaltung wird noch geladen.")
      return
    }
    if (!isDraft()) {
      failure.set("Veröffentlichte Veranstaltungen können derzeit nicht archiviert werden.")
      return
    }
    inputs.openConfirm("veranstaltung-archiv")
  }

  /**
   * Archives the draft only after confirmation, then leaves for the list so
   * the detail never renders a dead archived view.
   */
  const confirmEventArchive = async () => {
    if (pending.get()) return
    if (!guardEditable()) return
    const orgId = inputs.orgId()
    if (!orgId) return
    const generation = scopeGeneration
    const eventKey = inputs.eventKey()
    pending.set(true)
    try {
      const archived = await sources.archiveEvent(orgId, eventKey)
      if (scopeGeneration !== generation) return
      if (!archived.success) {
        failure.set(archived.errorMessage)
        return
      }
      inputs.closeConfirm()
      inputs.toList()
    } finally {
      if (scopeGeneration === generation) pending.set(false)
    }
  }

  const tierPriceLabel = (priceCents: number | undefined): string =>
    priceCents === undefined ? "Preis auf Anfrage" : ticketPriceFormat(priceCents)

  const isDraft = (): boolean => detail()?.status === "draft"
  const isPublished = (): boolean => detail()?.status === "published"
  const isArchived = (): boolean => detail()?.status === "archived"

  return {
    detail,
    detailError,
    dirty: dirty.get,
    patchFieldChange,
    patchSave,
    faqRows,
    faqAdd,
    faqChange,
    faqDelete,
    faqClear,
    faqAtLimit: () => faqRows().length >= catalogEventFaqsSchema.pipe[1].requirement,
    scheduleRows,
    scheduleAdd,
    scheduleChange,
    scheduleDelete,
    scheduleClear,
    scheduleAtLimit: () => scheduleRows().length >= catalogEventScheduleSchema.pipe[1].requirement,
    contentReload,
    berlinLocal,
    sheetOpen,
    sheetTier,
    sheetIsNew: () => sheetTierKey() === newTierKey,
    tierDraft: tierDraft.get,
    tierFieldChange,
    tierSave,
    requestTierArchive,
    confirmTierArchive,
    publish,
    requestEventArchive,
    confirmEventArchive,
    confirmKind: inputs.confirm,
    dismissConfirm: () => inputs.closeConfirm(),
    tierPriceLabel,
    pending: pending.get,
    failure: failure.get,
    isDraft,
    isPublished,
    isArchived,
    canEdit: inputs.canEdit,
    canManageTiers: inputs.canManageTiers,
    canReadOrders: inputs.canReadOrders ?? (() => false),
    canReadParticipants: inputs.canReadParticipants ?? (() => false),
    canEnter: inputs.canEnter ?? (() => false),
    canUseBoxOffice: inputs.canUseBoxOffice ?? (() => false),
    openTier: inputs.openTier,
    closeTier: () => {
      seededFor = null
      inputs.closeTier()
    },
  }
}

export type VeranstalterDashboardEventDetailState = ReturnType<typeof veranstalterDashboardEventDetailStateCreate>
