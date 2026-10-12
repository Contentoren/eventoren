import { catalogE2eLegacyNativeAuthCheck } from "./catalogE2eLegacyNativeAuthCheck.js"
import { catalogE2eLegacyReadinessCheck } from "./catalogE2eLegacyReadinessCheck.js"
import {
  catalogE2eLegacyTechnicalCheckoutCheck,
  catalogE2eLegacyTechnicalCheckoutEventKey,
} from "./catalogE2eLegacyTechnicalCheckoutCheck.js"
import { catalogE2eLegacyReadinessEventKey } from "./catalogE2eLegacyReadinessCheck.js"
import { catalogE2eOwnedEventCheck } from "./catalogE2eOwnedEventCheck.js"

export type CatalogSyncSnapshotFixtureKind = "ticket-e2e" | "native-auth" | "readiness" | "technical-checkout"

type SnapshotPayloadShape = {
  eventKey?: unknown
  title?: unknown
  organizer?: unknown
  description?: unknown
  imageUrl?: unknown
}

/**
 * Classify one denormalized catalog snapshot payload by the same approved
 * exact legacy/current ticket markers used for live rows. Snapshot chunks
 * carry chunked event JSON (eventKey/title/organizer/description/imageUrl);
 * a generic e2e substring never establishes ownership. Returns the fixture
 * kind or null for genuine/foreign rows. Unparsable or field-incomplete
 * payloads return null so genuine data is never deleted.
 */
export function catalogSyncSnapshotFixtureKindFor(
  payload: SnapshotPayloadShape,
): CatalogSyncSnapshotFixtureKind | null {
  if (typeof payload.eventKey !== "string") return null
  const eventKey = payload.eventKey
  if (eventKey === catalogE2eLegacyTechnicalCheckoutEventKey) {
    if (typeof payload.description !== "string") return null
    const checked = catalogE2eLegacyTechnicalCheckoutCheck({ eventKey, description: payload.description })
    if (!checked.success) return null
    return "technical-checkout"
  }
  if (eventKey === catalogE2eLegacyReadinessEventKey) {
    if (typeof payload.description !== "string" || typeof payload.imageUrl !== "string") return null
    const checked = catalogE2eLegacyReadinessCheck({
      eventKey,
      description: payload.description,
      imageUrl: payload.imageUrl,
    })
    if (!checked.success) return null
    return "readiness"
  }
  if (eventKey.startsWith("native-auth-")) {
    if (typeof payload.title !== "string") return null
    const checked = catalogE2eLegacyNativeAuthCheck({ eventKey, title: payload.title })
    if (!checked.success) return null
    return "native-auth"
  }
  if (typeof payload.title !== "string" || typeof payload.organizer !== "string") return null
  const owned = catalogE2eOwnedEventCheck({ eventKey, title: payload.title, organizer: payload.organizer })
  if (!owned.success) return null
  return "ticket-e2e"
}
