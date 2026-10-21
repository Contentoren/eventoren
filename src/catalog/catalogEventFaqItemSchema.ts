import * as v from "valibot"

/**
 * One FAQ entry of a catalog event. The `id` stays stable across edits so
 * clients can track entries while the organizer reorders or rewrites them.
 */
export const catalogEventFaqItemSchema = v.object({
  id: v.pipe(
    v.string(),
    v.minLength(1, "FAQ id must not be empty"),
    v.maxLength(64, "FAQ id must not exceed 64 characters"),
    v.regex(/^[A-Za-z0-9_-]+$/, "FAQ id must only contain letters, digits, dashes and underscores"),
  ),
  question: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "FAQ question must not be empty"),
    v.maxLength(200, "FAQ question must not exceed 200 characters"),
  ),
  answer: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, "FAQ answer must not be empty"),
    v.maxLength(1000, "FAQ answer must not exceed 1000 characters"),
  ),
})

export type CatalogEventFaqItem = v.InferOutput<typeof catalogEventFaqItemSchema>
