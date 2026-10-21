import { type Accessor, createRenderEffect } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import type { Result } from "#result"
import { adminEventReleaseDateTimeFromIso } from "#src/admin/adminEventReleaseDateTimeFromIso.ts"
import { ticketPriceFormat } from "#src/ticketing/ticketPriceFormat.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { OrganizerDashboardEventCreate } from "../../events/model/organizerDashboardEventCreateSchema.ts"
import type { OrganizerDashboardEventDetail } from "../../events/model/organizerDashboardEventDetailCreate.ts"
import type { OrganizerDashboardEventPatch } from "../../events/model/organizerDashboardEventPatchSchema.ts"
import type { OrganizerDashboardTierUpsert } from "../../events/model/organizerDashboardTierUpsertSchema.ts"
import type { VeranstalterDashboardEventCreateDraftCache } from "./veranstalterDashboardEventCreateDraftCache.ts"
import { veranstalterDashboardEventCreateDraftCacheCreate } from "./veranstalterDashboardEventCreateDraftCache.ts"
import type { VeranstalterDashboardEventBaseForm } from "./veranstalterDashboardEventFormValidate.ts"
import {
  veranstalterDashboardEventBaseFormEmpty,
  veranstalterDashboardEventFormValidate,
} from "./veranstalterDashboardEventFormValidate.ts"
import type { VeranstalterDashboardEventTierForm } from "./veranstalterDashboardEventTierFormValidate.ts"
import {
  veranstalterDashboardEventTierFormEmpty,
  veranstalterDashboardEventTierFormValidate,
} from "./veranstalterDashboardEventTierFormValidate.ts"
import { veranstalterDashboardEventMutationsCreate } from "./veranstalterDashboardEventMutationsCreate.ts"

export type VeranstalterDashboardEventCreateStep = 0 | 1 | 2

export type VeranstalterDashboardEventCreateWizardTarget = {
  readonly step: VeranstalterDashboardEventCreateStep
  readonly entwurf: string | undefined
  readonly tier: string | undefined
}

/**
 * Thin datasource surface so state tests can inject fakes without SDK mocks.
 * Defaults below wire the live Convex mutations and the live draft query.
 */
export type VeranstalterDashboardEventCreateSources = {
  readonly createEvent: (
    orgId: string,
    input: OrganizerDashboardEventCreate,
  ) => Promise<Result<{ readonly eventKey: string }>>
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
  readonly publishEvent: (orgId: string, eventKey: string) => Promise<Result<unknown>>
  readonly watchDraft: (
    orgId: () => string | undefined,
    eventKey: () => string | undefined,
  ) => Accessor<Result<OrganizerDashboardEventDetail> | undefined>
}

export function veranstalterDashboardEventCreateStateCreate(inputs: {
  readonly orgId: () => string | undefined
  readonly orgActive: () => boolean
  /** Shell permission `events.bearbeiten`; without it the wizard is read-only. */
  readonly canEdit: () => boolean
  /** URL-owned wizard position; the single source of truth across back/reload. */
  readonly step: () => VeranstalterDashboardEventCreateStep
  /** URL-owned server draft key (`entwurf`). */
  readonly draftKey: () => string | undefined
  /** URL-owned saved tier key. */
  readonly savedTierKey: () => string | undefined
  readonly toWizard: (next: VeranstalterDashboardEventCreateWizardTarget) => void
  readonly toEvent: (eventKey: string) => void
  readonly toList: () => void
  readonly sources?: VeranstalterDashboardEventCreateSources | undefined
  readonly cache?: VeranstalterDashboardEventCreateDraftCache | undefined
}) {
  const base = createSignalObject<VeranstalterDashboardEventBaseForm>(veranstalterDashboardEventBaseFormEmpty)
  const tier = createSignalObject<VeranstalterDashboardEventTierForm>(veranstalterDashboardEventTierFormEmpty)
  const createdKey = createSignalObject<string | null>(null)
  const sentTierKey = createSignalObject<string | null>(null)
  const pending = createSignalObject(false)
  const failure = createSignalObject<string | null>(null)

  const sources: VeranstalterDashboardEventCreateSources = inputs.sources ?? {
    ...veranstalterDashboardEventMutationsCreate(),
    watchDraft: (orgId, eventKey) =>
      queryCreate(api.organizerDashboardEvents.organizerDashboardEventGetQuery, () => {
        const currentOrg = orgId()
        const currentKey = eventKey()
        if (!currentOrg || !currentKey) return undefined
        return { orgId: currentOrg as Id<"orgs">, eventKey: currentKey }
      }),
  }
  const cache =
    inputs.cache ??
    veranstalterDashboardEventCreateDraftCacheCreate(typeof localStorage === "undefined" ? undefined : localStorage)

  /** Server draft key: freshly created this session, else resumed from the URL. */
  const effectiveDraftKey = (): string | undefined => createdKey.get() ?? inputs.draftKey()
  const effectiveTierKey = (): string | undefined => sentTierKey.get() ?? inputs.savedTierKey()

  const draftResult = sources.watchDraft(inputs.orgId, effectiveDraftKey)
  const draftDetail = (): OrganizerDashboardEventDetail | undefined => {
    const current = draftResult()
    if (!current?.success) return undefined
    return current.data
  }
  const resumeError = (): string | null => {
    if (!effectiveDraftKey()) return null
    const current = draftResult()
    if (current && !current.success) return current.errorMessage
    return null
  }
  const isResuming = (): boolean => effectiveDraftKey() !== undefined && draftDetail() === undefined

  const baseFromDetail = (detail: OrganizerDashboardEventDetail): VeranstalterDashboardEventBaseForm => ({
    ...veranstalterDashboardEventBaseFormEmpty,
    title: detail.title,
    subtitle: detail.subtitle,
    description: detail.description,
    category: detail.category,
    startsAtLocal: adminEventReleaseDateTimeFromIso(detail.startsAt),
    endsAtLocal: adminEventReleaseDateTimeFromIso(detail.endsAt),
    doorsAtLocal: adminEventReleaseDateTimeFromIso(detail.doorsAt),
    bookingOpensAtLocal: detail.bookingOpensAt ? adminEventReleaseDateTimeFromIso(detail.bookingOpensAt) : "",
    venue: detail.venue,
    city: detail.city,
    address: detail.address,
    organizer: detail.organizer,
    imageUrl: detail.imageUrl,
    imageAlt: detail.imageAlt,
  })

  const tierFromDetail = (
    detail: OrganizerDashboardEventDetail,
    tierKey: string,
  ): VeranstalterDashboardEventTierForm | null => {
    const found = detail.tiers.find((entry) => entry.tierKey === tierKey)
    if (!found) return null
    return {
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
    }
  }

  // Resume once per draft+tier pair from the authorized server draft. Live
  // updates afterwards never overwrite local input; a missing tier keeps
  // waiting instead of seeding an empty form that would duplicate it.
  let resumedFor: string | null = null
  createRenderEffect(() => {
    const key = effectiveDraftKey()
    if (!key) return
    const detail = draftDetail()
    if (!detail) return
    const savedTier = effectiveTierKey()
    const stamp = `${key}|${savedTier ?? ""}`
    if (resumedFor === stamp) return
    if (savedTier && !detail.tiers.some((entry) => entry.tierKey === savedTier)) return
    base.set(baseFromDetail(detail))
    if (savedTier) {
      const restored = tierFromDetail(detail, savedTier)
      if (restored) tier.set(restored)
    }
    resumedFor = stamp
  })

  // Unsent step-0 input survives a reload via the validated idle cache only
  // while no server draft exists; the server draft always wins on resume.
  let cachePrimedFor: string | null = null
  createRenderEffect(() => {
    const orgId = inputs.orgId()
    if (!orgId || effectiveDraftKey() || cachePrimedFor === orgId) return
    cachePrimedFor = orgId
    const cached = cache.load(orgId, null)
    if (cached) base.set(cached)
  })

  const baseFieldChange = (field: keyof VeranstalterDashboardEventBaseForm, value: string) => {
    failure.set(null)
    const next = { ...base.get(), [field]: value }
    base.set(next)
    const orgId = inputs.orgId()
    if (orgId) cache.scheduleSave(orgId, effectiveDraftKey() ?? null, next)
  }

  const tierFieldChange = (field: keyof VeranstalterDashboardEventTierForm, value: string) => {
    failure.set(null)
    tier.set({ ...tier.get(), [field]: value })
  }

  const guardEditable = (): boolean => {
    if (inputs.canEdit()) return true
    failure.set("Keine Berechtigung: Der Assistent ist nur mit Bearbeitungsrecht veränderbar.")
    return false
  }

  /**
   * Step 0 → 1: validates, then creates the real draft once. Going back and
   * changing base values calls the real update mutation before advancing, so
   * the review step never publishes stale values.
   */
  const baseNext = async () => {
    if (pending.get()) return
    if (!guardEditable()) return
    const validated = veranstalterDashboardEventFormValidate(base.get())
    if (!validated.success) {
      failure.set(validated.errorMessage)
      return
    }
    const orgId = inputs.orgId()
    if (!orgId) {
      failure.set("Keine Organisation ausgewählt.")
      return
    }
    pending.set(true)
    try {
      const existing = effectiveDraftKey()
      if (existing) {
        const updated = await sources.updateEvent(orgId, existing, validated.data)
        if (!updated.success) {
          failure.set(`Der Entwurf (${existing}) konnte nicht gespeichert werden: ${updated.errorMessage}`)
          return
        }
        inputs.toWizard({ step: 1, entwurf: existing, tier: effectiveTierKey() })
        return
      }
      const created = await sources.createEvent(orgId, validated.data)
      if (!created.success) {
        failure.set(created.errorMessage)
        return
      }
      createdKey.set(created.data.eventKey)
      cache.clear(orgId, null)
      inputs.toWizard({ step: 1, entwurf: created.data.eventKey, tier: effectiveTierKey() })
    } finally {
      pending.set(false)
    }
  }

  /**
   * Step 1 → 2: upserts the tier against the kept draft key and stores the
   * returned tier key, so going back and saving again updates instead of
   * duplicating the tier. On failure the draft key is retained for retry.
   */
  const tierSave = async () => {
    if (pending.get()) return
    if (!guardEditable()) return
    const validated = veranstalterDashboardEventTierFormValidate(tier.get())
    if (!validated.success) {
      failure.set(validated.errorMessage)
      return
    }
    const orgId = inputs.orgId()
    const eventKey = effectiveDraftKey()
    if (!eventKey || !orgId) {
      failure.set("Der Entwurf fehlt — bitte beginne erneut bei Schritt 1.")
      inputs.toWizard({ step: 0, entwurf: undefined, tier: undefined })
      return
    }
    pending.set(true)
    try {
      const previousTierKey = effectiveTierKey()
      const saved = await sources.upsertTier(orgId, eventKey, {
        ...(previousTierKey ? { tierKey: previousTierKey } : {}),
        ...validated.data,
      })
      if (!saved.success) {
        failure.set(
          `Tarif konnte nicht gespeichert werden. Der Entwurf (${eventKey}) bleibt erhalten: ${saved.errorMessage}`,
        )
        return
      }
      sentTierKey.set(saved.data.tierKey)
      inputs.toWizard({ step: 2, entwurf: eventKey, tier: saved.data.tierKey })
    } finally {
      pending.set(false)
    }
  }

  const tierSkip = () => {
    failure.set(null)
    inputs.toWizard({ step: 2, entwurf: effectiveDraftKey(), tier: effectiveTierKey() })
  }

  /** Step 2: publishes only when the backend accepts the ready draft. */
  const publish = async () => {
    if (pending.get()) return
    if (!guardEditable()) return
    const orgId = inputs.orgId()
    const eventKey = effectiveDraftKey()
    if (!eventKey || !orgId) {
      failure.set("Der Entwurf fehlt — bitte beginne erneut bei Schritt 1.")
      inputs.toWizard({ step: 0, entwurf: undefined, tier: undefined })
      return
    }
    pending.set(true)
    try {
      const published = await sources.publishEvent(orgId, eventKey)
      if (!published.success) {
        failure.set(published.errorMessage)
        return
      }
      cache.clear(orgId, eventKey)
      inputs.toEvent(eventKey)
    } finally {
      pending.set(false)
    }
  }

  const stepBack = () => {
    failure.set(null)
    const previous = ((inputs.step() + 2) % 3) as VeranstalterDashboardEventCreateStep
    inputs.toWizard({ step: previous, entwurf: effectiveDraftKey(), tier: effectiveTierKey() })
  }

  const tierPriceLabel = (): string => {
    if (tier.get().name.trim().length === 0) return "Noch kein Tarif"
    const validated = veranstalterDashboardEventTierFormValidate(tier.get())
    if (!validated.success) {
      const raw = tier.get().priceEuros.trim()
      return raw ? `${raw} €` : "Noch kein Tarif"
    }
    return ticketPriceFormat(validated.data.priceCents)
  }

  return {
    step: inputs.step,
    base: base.get,
    baseFieldChange,
    tier: tier.get,
    tierFieldChange,
    tierPriceLabel,
    createdKey: effectiveDraftKey,
    savedTierKey: effectiveTierKey,
    isResuming,
    resumeError,
    pending: pending.get,
    failure: failure.get,
    orgActive: inputs.orgActive,
    canEdit: inputs.canEdit,
    isLocked: () => !inputs.canEdit(),
    baseNext,
    tierSave,
    tierSkip,
    publish,
    stepBack,
    cancel: inputs.toList,
  }
}

export type VeranstalterDashboardEventCreateState = ReturnType<typeof veranstalterDashboardEventCreateStateCreate>
