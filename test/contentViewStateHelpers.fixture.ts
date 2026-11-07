import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentListItem } from "../src/app/content/ContentListItem.ts"
import type { ContentMeta } from "../src/app/content/ContentMeta.ts"

/** Minimal published Ratgeber list item for view-state tests. */
export function contentListItemFixture(
  slug: string,
  category: string,
  overrides: { entry?: Partial<ContentEntry>; meta?: Partial<ContentMeta> } = {},
): ContentListItem {
  return {
    entry: {
      id: `2026-11-06-${slug}`,
      slug,
      path: `/ratgeber/${slug}`,
      contentPath: `/ratgeber/2026-11-06-${slug}.md`,
      image: null,
      imagePath: null,
      title: `Titel ${slug}`,
      description: `Beschreibung ${slug}`,
      publishedAt: "2026-11-06",
      updatedAt: null,
      author: "Eventoren Redaktion",
      imageAlt: null,
      ...overrides.entry,
    },
    meta: {
      collection: "ratgeber",
      lang: "de",
      category,
      keywords: [],
      translationKey: null,
      seoTitle: null,
      readingMinutes: 8,
      wordCount: 1600,
      ...overrides.meta,
    },
  }
}
