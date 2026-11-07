import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

export function contentPathCreate(collection: ContentCollection, slug: string): string {
  return `${contentCollectionConfig[collection].pathBase}/${slug}`
}
