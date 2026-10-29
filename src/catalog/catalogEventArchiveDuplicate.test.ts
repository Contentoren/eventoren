import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { catalogEventAdminListVisible } from "./catalogEventAdminListVisible.ts"
import { catalogEventArchiveInputSchema } from "./catalogEventArchiveInputSchema.ts"
import { catalogEventArchivePatchCreate } from "./catalogEventArchivePatchCreate.ts"
import { catalogEventDuplicateInputSchema } from "./catalogEventDuplicateInputSchema.ts"
import { catalogEventDuplicateKeyCreate } from "./catalogEventDuplicateKeyCreate.ts"
import { catalogEventDuplicatePrepareCreate } from "./catalogEventDuplicatePrepareCreate.ts"
import { catalogEventDuplicateTierLimit } from "./catalogEventDuplicateTierLimit.ts"

const sourceEvent = {
  eventKey: "sommer-fest",
  title: "Sommerfest",
  subtitle: "Open Air",
  description: "Musik und Essen",
  category: "konzerte",
  startsAt: "2027-06-01T18:00:00.000Z",
  endsAt: "2027-06-01T22:00:00.000Z",
  doorsAt: "2027-06-01T17:00:00.000Z",
  bookingOpensAt: "2027-05-01T10:00:00.000Z",
  venue: "Saal",
  city: "Berlin",
  address: "Straße 1",
  organizer: "Org",
  imageUrl: "/images/fest.webp",
  imageVariants: {
    assetId: "asset-1",
    detail: "/images/fest.webp",
    card: "/images/fest.webp",
    organizer: "/images/fest.webp",
  },
  imageAlt: "Fest",
  tags: ["open-air"],
  faqs: [{ id: "faq-1", question: "Wo?", answer: "Dort." }],
  schedule: [{ id: "slot-1", time: "19:30", title: "Beginn", detail: "Bühne" }],
  highlights: [{ title: "Live", description: "Band" }],
  inclusions: ["Garderobe"],
  exclusions: ["Tiere"],
  allowedStripePaymentMethods: ["card", "klarna"] as ("card" | "klarna")[],
  orgId: undefined,
}

const sourceTier = {
  tierKey: "standard",
  name: "Standard",
  description: "Freie Platzwahl",
  startsAt: "2027-06-01T18:00:00.000Z",
  doorsAt: "2027-06-01T17:00:00.000Z",
  additionalDoorsAt: [{ startsAt: "2027-06-01T19:00:00.000Z", endsAt: "2027-06-01T20:00:00.000Z" }],
  endsAt: "2027-06-01T22:00:00.000Z",
  priceCents: 2500,
  feeCents: 250,
  capacity: 100,
  maxPerOrder: 4,
  activationCodeRequired: true,
  sortOrder: 0,
}

describe("catalog event archive and duplicate operation contracts", () => {
  test("archive and duplicate inputs share the authorized eventKey plus token contract", () => {
    for (const [schema, op] of [
      [catalogEventArchiveInputSchema, "archive"],
      [catalogEventDuplicateInputSchema, "duplicate"],
    ] as const) {
      expect(v.safeParse(schema, { eventKey: "event-1", token: "token-1" }).success, op).toBe(true)
      expect(v.safeParse(schema, { eventKey: "", token: "token-1" }).success, op).toBe(false)
      expect(v.safeParse(schema, { eventKey: "event-1" }).success, op).toBe(false)
    }
  })

  test("archive patch flips status only, without lifecycle deletion markers", () => {
    const patch = catalogEventArchivePatchCreate({
      catalogVersion: 7,
      eventRevision: 2,
      now: "2027-01-01T00:00:00.000Z",
    })
    expect(patch).toEqual({
      status: "archived",
      catalogVersion: 7,
      eventRevision: 3,
      updatedAt: "2027-01-01T00:00:00.000Z",
    })
    expect("deletedAt" in patch).toBe(false)
  })

  test("admin visibility keeps current defaults and opens archive-only to legacy archives", () => {
    const draft = { status: "draft", deletedAt: undefined } as const
    const liveArchive = { status: "archived", deletedAt: undefined } as const
    const legacyArchive = { status: "archived", deletedAt: "2026-09-01T00:00:00.000Z" } as const
    const deletedDraft = { status: "draft", deletedAt: "2026-09-01T00:00:00.000Z" } as const
    expect(catalogEventAdminListVisible(draft, false)).toBe(true)
    expect(catalogEventAdminListVisible(liveArchive, false)).toBe(false)
    expect(catalogEventAdminListVisible(legacyArchive, false)).toBe(false)
    expect(catalogEventAdminListVisible(deletedDraft, false)).toBe(false)
    expect(catalogEventAdminListVisible(draft, true)).toBe(false)
    expect(catalogEventAdminListVisible(liveArchive, true)).toBe(true)
    expect(catalogEventAdminListVisible(legacyArchive, true)).toBe(true)
    expect(catalogEventAdminListVisible(deletedDraft, true)).toBe(false)
  })

  test("duplicate keys differ from source keys while staying deterministic for fixed randomness", () => {
    const first = catalogEventDuplicateKeyCreate("Sommer Fest!", () => 0, 1000)
    const second = catalogEventDuplicateKeyCreate("Sommer Fest!", () => 0, 1000)
    const other = catalogEventDuplicateKeyCreate("Sommer Fest!", () => 0.5, 2000)
    expect(first.success && second.success && other.success).toBe(true)
    if (!first.success || !second.success || !other.success) return
    expect(first.data).toBe(second.data)
    expect(first.data.startsWith("sommer-fest-kopie-")).toBe(true)
    expect(first.data).not.toBe("sommer-fest")
    expect(other.data).not.toBe(first.data)
    expect(catalogEventDuplicateKeyCreate("", () => 0, 1000).success).toBe(false)
  })

  test("duplicate preparation copies editable config with fresh draft keys and zero counters", () => {
    const prepared = catalogEventDuplicatePrepareCreate({
      event: sourceEvent,
      tiers: [sourceTier],
      now: "2027-01-02T00:00:00.000Z",
      random: () => 0.25,
      nowMs: 1700000000000,
    })
    expect(prepared.success).toBe(true)
    if (!prepared.success) return
    const draft = prepared.data
    expect(draft.eventKey).not.toBe(sourceEvent.eventKey)
    expect(draft.event.eventKey).toBe(draft.eventKey)
    expect(draft.event.status).toBe("draft")
    expect(draft.event.eventRevision).toBe(1)
    expect(draft.event.title).toBe(sourceEvent.title)
    expect(draft.event.allowedStripePaymentMethods).toEqual(["card", "klarna"])
    expect(draft.event.schedule).toEqual(sourceEvent.schedule)
    expect("deletedAt" in draft.event).toBe(false)
    expect(draft.tiers).toHaveLength(1)
    const tier = draft.tiers[0]
    expect(tier).toMatchObject({
      name: sourceTier.name,
      capacity: sourceTier.capacity,
      priceCents: sourceTier.priceCents,
      feeCents: sourceTier.feeCents,
      maxPerOrder: 4,
      activationCodeRequired: true,
      reserved: 0,
      sold: 0,
    })
    expect(tier?.tierKey).not.toBe(sourceTier.tierKey)
    expect(tier?.additionalDoorsAt).toEqual(sourceTier.additionalDoorsAt)
  })

  test("source records stay unchanged and extreme tier counts fail explicitly before writes", () => {
    const eventSnapshot = JSON.stringify(sourceEvent)
    const tierSnapshot = JSON.stringify(sourceTier)
    const prepared = catalogEventDuplicatePrepareCreate({
      event: sourceEvent,
      tiers: [sourceTier],
      now: "2027-01-02T00:00:00.000Z",
      random: () => 0.1,
      nowMs: 1700000000000,
    })
    expect(prepared.success).toBe(true)
    expect(JSON.stringify(sourceEvent)).toBe(eventSnapshot)
    expect(JSON.stringify(sourceTier)).toBe(tierSnapshot)

    const oversized = catalogEventDuplicatePrepareCreate({
      event: sourceEvent,
      tiers: Array.from({ length: catalogEventDuplicateTierLimit + 1 }, (_, index) => ({
        ...sourceTier,
        tierKey: `tier-${index}`,
      })),
      now: "2027-01-02T00:00:00.000Z",
      random: () => 0.1,
      nowMs: 1700000000000,
    })
    expect(oversized.success).toBe(false)
  })
})
