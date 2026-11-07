import type { ContentListItem } from "./ContentListItem.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentEntryList } from "./contentEntryList.ts"
import { contentMetaList } from "./contentMetaList.ts"
import { contentTodayRead } from "./contentTodayRead.ts"

/** Published entries of a collection with their metadata, newest first (then by title). */
export function contentCollectionList(
  collection: ContentCollection,
  today: string = contentTodayRead(),
): ContentListItem[] {
  const metaById = contentMetaList[collection]
  const items: ContentListItem[] = []
  for (const entry of contentEntryList(collection)) {
    const meta = metaById[entry.id]
    if (meta === undefined || entry.publishedAt > today) continue
    items.push({ entry, meta })
  }
  return items.sort(
    (left, right) =>
      right.entry.publishedAt.localeCompare(left.entry.publishedAt) ||
      left.entry.title.localeCompare(right.entry.title),
  )
}
