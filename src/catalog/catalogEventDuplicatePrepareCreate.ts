import type { Doc } from "#convex/_generated/dataModel.js"
import { createResult, createResultError, type Result } from "#result"
import { eventTicketTierActivationCodeRequiredGet } from "#src/events/eventTicketTierActivationCodeRequiredGet.ts"
import { eventTicketTierMaxPerOrderGet } from "#src/events/eventTicketTierMaxPerOrderGet.ts"
import { catalogEventDuplicateKeyCreate } from "./catalogEventDuplicateKeyCreate.ts"

const maxDuplicateTiersPerEvent = 100
const tierKeyAlphabet = "abcdefghijklmnopqrstuvwxyz0123456789"

type CatalogEventDuplicateSource = Pick<
  Doc<"catalogEvents">,
  | "eventKey"
  | "title"
  | "subtitle"
  | "description"
  | "category"
  | "startsAt"
  | "endsAt"
  | "doorsAt"
  | "bookingOpensAt"
  | "venue"
  | "city"
  | "address"
  | "organizer"
  | "imageUrl"
  | "imageVariants"
  | "imageAlt"
  | "tags"
  | "faqs"
  | "schedule"
  | "highlights"
  | "inclusions"
  | "exclusions"
  | "allowedStripePaymentMethods"
  | "orgId"
>

type CatalogEventDuplicateTier = Pick<
  Doc<"catalogTicketTiers">,
  | "tierKey"
  | "name"
  | "description"
  | "startsAt"
  | "doorsAt"
  | "additionalDoorsAt"
  | "endsAt"
  | "priceCents"
  | "feeCents"
  | "capacity"
  | "maxPerOrder"
  | "activationCodeRequired"
  | "sortOrder"
>

export type CatalogEventDuplicatePrepared = {
  readonly eventKey: string
  readonly event: Omit<CatalogEventDuplicateSource, "eventKey"> & {
    readonly eventKey: string
    readonly status: "draft"
    readonly eventRevision: number
    readonly createdAt: string
    readonly updatedAt: string
  }
  readonly tiers: readonly CatalogEventDuplicateTierDraft[]
}

export type CatalogEventDuplicateTierDraft = Omit<
  CatalogEventDuplicateTier,
  "tierKey" | "startsAt" | "doorsAt" | "endsAt"
> & {
  readonly tierKey: string
  readonly startsAt: string
  readonly doorsAt: string
  readonly endsAt: string
  readonly reserved: 0
  readonly sold: 0
  readonly createdAt: string
  readonly updatedAt: string
}

export function catalogEventDuplicatePrepareCreate(input: {
  readonly event: CatalogEventDuplicateSource
  readonly tiers: readonly CatalogEventDuplicateTier[]
  readonly now: string
  readonly random: () => number
  readonly nowMs: number
}): Result<CatalogEventDuplicatePrepared> {
  const op = "catalogEventDuplicatePrepareCreate"
  if (input.tiers.length > maxDuplicateTiersPerEvent) {
    return createResultError(op, `An event cannot duplicate more than ${maxDuplicateTiersPerEvent} ticket tiers`)
  }

  const eventKeyResult = catalogEventDuplicateKeyCreate(input.event.eventKey, input.random, input.nowMs)
  if (!eventKeyResult.success) return eventKeyResult
  const eventKey = eventKeyResult.data

  const tiers: CatalogEventDuplicateTierDraft[] = []
  const tierKeys = new Set<string>()
  for (const [index, tier] of input.tiers.entries()) {
    if (!Number.isInteger(tier.capacity) || tier.capacity < 0) {
      return createResultError(op, "Ticket tier capacity must be a non-negative integer")
    }
    const startsAt = tier.startsAt ?? input.event.startsAt
    const doorsAt = tier.doorsAt ?? input.event.doorsAt
    const endsAt = tier.endsAt ?? input.event.endsAt
    if (!startsAt || !endsAt || Number.isNaN(Date.parse(startsAt)) || Number.isNaN(Date.parse(endsAt))) {
      return createResultError(op, "Ticket tier must have a valid start and end time")
    }
    if (Date.parse(endsAt) <= Date.parse(startsAt)) {
      return createResultError(op, "End time must be after start time")
    }
    const tierKey = catalogEventDuplicateTierKeyCreate(tier.tierKey, index, input.random)
    if (tierKeys.has(tierKey)) return createResultError(op, "Duplicate ticket tier key generated, please retry")
    tierKeys.add(tierKey)
    tiers.push({
      tierKey,
      name: tier.name,
      description: tier.description,
      startsAt,
      doorsAt,
      additionalDoorsAt: (tier.additionalDoorsAt ?? []).map((range) =>
        typeof range === "string" ? { startsAt: range, endsAt: "" } : range,
      ),
      endsAt,
      priceCents: tier.priceCents,
      feeCents: tier.feeCents,
      capacity: tier.capacity,
      maxPerOrder: eventTicketTierMaxPerOrderGet(tier),
      activationCodeRequired: eventTicketTierActivationCodeRequiredGet(tier),
      sortOrder: tier.sortOrder,
      reserved: 0,
      sold: 0,
      createdAt: input.now,
      updatedAt: input.now,
    })
  }

  return createResult({
    eventKey,
    event: {
      eventKey,
      title: input.event.title,
      subtitle: input.event.subtitle,
      description: input.event.description,
      category: input.event.category,
      startsAt: input.event.startsAt,
      endsAt: input.event.endsAt,
      doorsAt: input.event.doorsAt,
      bookingOpensAt: input.event.bookingOpensAt,
      venue: input.event.venue,
      city: input.event.city,
      address: input.event.address,
      organizer: input.event.organizer,
      imageUrl: input.event.imageUrl,
      imageVariants: input.event.imageVariants,
      imageAlt: input.event.imageAlt,
      tags: [...input.event.tags],
      faqs: input.event.faqs,
      schedule: input.event.schedule,
      highlights: input.event.highlights,
      inclusions: input.event.inclusions,
      exclusions: input.event.exclusions,
      allowedStripePaymentMethods: input.event.allowedStripePaymentMethods,
      orgId: input.event.orgId,
      status: "draft",
      eventRevision: 1,
      createdAt: input.now,
      updatedAt: input.now,
    },
    tiers,
  })
}

function catalogEventDuplicateTierKeyCreate(sourceTierKey: string, index: number, random: () => number): string {
  const slug = sourceTierKey
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 30)
    .replace(/-+$/, "")
  const fallback = slug.length > 0 ? slug : "tier"
  let suffix = ""
  for (let count = 0; count < 4; count += 1) {
    suffix += tierKeyAlphabet[Math.floor(random() * tierKeyAlphabet.length)] ?? "a"
  }
  return `${fallback}-kopie-${index.toString(36)}${suffix}`
}
