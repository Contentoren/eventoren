import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

/** Buyer articles get a buyer CTA (discover events); everything else the organiser CTA. */
export function contentCtaVariantRead(collection: ContentCollection, category: string): "organiser" | "buyer" {
  return category === contentCollectionConfig[collection].buyerCategory ? "buyer" : "organiser"
}
