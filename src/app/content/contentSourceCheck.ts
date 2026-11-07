import type { ContentIssue } from "./ContentIssue.ts"
import type { ContentLinkTargets } from "./ContentLinkTargets.ts"
import { contentBodyCheck } from "./contentBodyCheck.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentFilenameParse } from "./contentFilenameParse.ts"
import { contentFrontmatterCheck } from "./contentFrontmatterCheck.ts"
import { contentSourceParse } from "./contentSourceParse.ts"

/** All per-file checks for one Markdown source: filename, frontmatter and body rules. */
export function contentSourceCheck(options: {
  readonly fileName: string
  readonly source: string
  readonly collection: ContentCollection
  readonly linkTargets: ContentLinkTargets
}): ContentIssue[] {
  const filename = contentFilenameParse(options.fileName)
  if (filename === undefined)
    return [
      { level: "error", message: `filename must match YYYY-MM-DD-<slug>.md (lowercase slug): ${options.fileName}` },
    ]

  const parsed = contentSourceParse(options.source)
  if (!parsed.success) return [{ level: "error", message: parsed.errorMessage }]

  const frontmatterIssues = contentFrontmatterCheck(parsed.data.data, options.collection, filename.slug)
  const category = typeof parsed.data.data.category === "string" ? parsed.data.data.category : ""
  const bodyIssues = contentBodyCheck(parsed.data.body, {
    collection: options.collection,
    category,
    linkTargets: options.linkTargets,
  })
  return [...frontmatterIssues, ...bodyIssues]
}
