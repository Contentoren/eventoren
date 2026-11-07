import type { ContentCard } from "./ContentCard.ts"
import type { ContentListItem } from "./ContentListItem.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import { contentDateFormat } from "./contentDateFormat.ts"
import { contentImageRead } from "./contentImages.ts"
import { contentViewLabels } from "./contentViewLabels.ts"

/** Card data (link, labels, Berlin date, image) for a published article. */
export function contentCardCreate(item: ContentListItem): ContentCard {
  const { entry, meta } = item
  const image = contentImageRead(entry)
  const date = entry.updatedAt ?? entry.publishedAt
  return {
    id: entry.id,
    href: entry.path,
    title: entry.title,
    description: entry.description,
    categoryLabel: contentCollectionConfig[meta.collection].categories[meta.category] ?? meta.category,
    readingTime: contentViewLabels[meta.lang].readingTime(meta.readingMinutes),
    date: contentDateFormat(date, meta.lang),
    dateIso: date,
    // Frontmatter alt first: EN guides reuse the DE image but carry English alt text.
    image: image === undefined ? null : { ...image, alt: entry.imageAlt ?? image.alt },
  }
}
