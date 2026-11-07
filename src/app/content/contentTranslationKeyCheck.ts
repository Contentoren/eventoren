import type { ContentIssue } from "./ContentIssue.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

type TranslationKeyItem = {
  readonly collection: ContentCollection
  readonly file: string
  readonly translationKey: string | null
}

/**
 * Each translationKey must appear exactly once per collection. A key without its counterpart in
 * the other collection is an error once both collections have articles, otherwise a warning.
 */
export function contentTranslationKeyCheck(items: readonly TranslationKeyItem[]): ContentIssue[] {
  const issues: ContentIssue[] = []
  const bothCollectionsFilled =
    items.some((item) => item.collection === "ratgeber") && items.some((item) => item.collection === "guides")
  const keys = new Set(items.flatMap((item) => (item.translationKey === null ? [] : [item.translationKey])))

  for (const key of [...keys].sort()) {
    const ratgeber = items.filter((item) => item.collection === "ratgeber" && item.translationKey === key)
    const guides = items.filter((item) => item.collection === "guides" && item.translationKey === key)
    for (const [collection, matches] of [
      ["ratgeber", ratgeber],
      ["guides", guides],
    ] as const) {
      if (matches.length > 1)
        issues.push({
          level: "error",
          message: `translationKey "${key}" is used ${matches.length}x in ${collection}: ${matches.map((item) => item.file).join(", ")}`,
        })
      if (matches.length === 0)
        issues.push({
          level: bothCollectionsFilled ? "error" : "warning",
          message: `translationKey "${key}" has no ${collection} article`,
        })
    }
  }
  return issues
}
