import type { ContentCollection } from "./contentCollectionSchema.ts"

/** Client-safe per-article metadata from the extended frontmatter plus computed reading time. */
export type ContentMeta = {
  readonly collection: ContentCollection
  readonly lang: "de" | "en"
  readonly category: string
  readonly keywords: readonly string[]
  readonly translationKey: string | null
  readonly seoTitle: string | null
  readonly readingMinutes: number
  readonly wordCount: number
}
