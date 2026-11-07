import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"
import {
  type ContentFrontmatterExtended,
  contentFrontmatterExtendedSchema,
} from "./contentFrontmatterExtendedSchema.ts"

/** Read `category`, `keywords`, `translationKey` and `seoTitle` from raw frontmatter data. */
export function contentMetaParse(data: unknown): Result<ContentFrontmatterExtended> {
  const op = "contentMetaParse"
  const parsed = a.safeParse(contentFrontmatterExtendedSchema, data)
  if (!parsed.success) return createResultError(op, a.summarize(parsed.issues), JSON.stringify(data))
  return createResult(parsed.output)
}
