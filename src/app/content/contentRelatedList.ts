import type { ContentListItem } from "./ContentListItem.ts"

/**
 * Related articles: up to `limit` from the same category (in list order, newest first),
 * filled up with the latest other articles. The current article is never included.
 */
export function contentRelatedList(
  current: ContentListItem,
  items: readonly ContentListItem[],
  limit = 3,
): ContentListItem[] {
  const others = items.filter((item) => item.entry.id !== current.entry.id)
  const sameCategory = others.filter((item) => item.meta.category === current.meta.category)
  const latest = others.filter((item) => item.meta.category !== current.meta.category)
  return [...sameCategory, ...latest].slice(0, limit)
}
