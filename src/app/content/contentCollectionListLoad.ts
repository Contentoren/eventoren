import type { ContentListItem } from "./ContentListItem.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

/**
 * Hub route loader: published items of a collection. The metadata/entry lists are imported lazily because
 * route loaders live in the eagerly loaded route tree; a static import would put them in the main entry
 * chunk that every page (including the homepage) loads.
 */
export async function contentCollectionListLoad(collection: ContentCollection): Promise<ContentListItem[]> {
  const { contentCollectionList } = await import("./contentCollectionList.ts")
  return contentCollectionList(collection)
}
