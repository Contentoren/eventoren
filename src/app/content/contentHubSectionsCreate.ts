import type { ContentHubSection } from "./ContentHubSection.ts"
import type { ContentListItem } from "./ContentListItem.ts"
import { contentCardCreate } from "./contentCardCreate.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

/** Hub sections in configured category order; empty categories are skipped so every jump link has a target. */
export function contentHubSectionsCreate(
  collection: ContentCollection,
  items: readonly ContentListItem[],
): ContentHubSection[] {
  const categories = contentCollectionConfig[collection].categories
  return Object.entries(categories)
    .map(([id, label]) => ({
      id,
      label,
      cards: items.filter((item) => item.meta.category === id).map(contentCardCreate),
    }))
    .filter((section) => section.cards.length > 0)
}
