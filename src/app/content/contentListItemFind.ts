import type { ContentListItem } from "./ContentListItem.ts"
import { contentCollectionList } from "./contentCollectionList.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentTodayRead } from "./contentTodayRead.ts"

/** Published entry with metadata by collection and slug. */
export function contentListItemFind(
  collection: ContentCollection,
  slug: string,
  today: string = contentTodayRead(),
): ContentListItem | undefined {
  return contentCollectionList(collection, today).find((item) => item.entry.slug === slug)
}
