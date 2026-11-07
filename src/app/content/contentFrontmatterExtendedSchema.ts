import * as a from "valibot"

/** Project-specific frontmatter keys that the content pipeline strips from its generated list. */
export const contentFrontmatterExtendedSchema = a.object({
  category: a.pipe(a.string(), a.trim(), a.nonEmpty("category is required")),
  keywords: a.optional(a.array(a.pipe(a.string(), a.trim(), a.nonEmpty())), []),
  translationKey: a.optional(a.nullable(a.pipe(a.string(), a.trim(), a.nonEmpty())), null),
  seoTitle: a.optional(a.nullable(a.pipe(a.string(), a.trim(), a.nonEmpty())), null),
})

export type ContentFrontmatterExtended = a.InferOutput<typeof contentFrontmatterExtendedSchema>
