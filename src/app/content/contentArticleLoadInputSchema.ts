import * as a from "valibot"
import { contentCollectionSchema } from "./contentCollectionSchema.ts"

export const contentArticleLoadInputSchema = a.object({
  collection: contentCollectionSchema,
  slug: a.pipe(a.string(), a.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "invalid slug")),
})

export type ContentArticleLoadInput = a.InferOutput<typeof contentArticleLoadInputSchema>
