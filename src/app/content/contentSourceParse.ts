import matter from "gray-matter"
import { createResult, createResultError, type Result } from "#result"

export type ContentSource = {
  readonly data: Readonly<Record<string, unknown>>
  readonly body: string
}

/** Split a Markdown source into frontmatter data and body. */
export function contentSourceParse(source: string): Result<ContentSource> {
  const op = "contentSourceParse"
  if (!/^---\r?\n/u.test(source)) return createResultError(op, "missing YAML frontmatter")
  try {
    const parsed = matter(source)
    return createResult({ data: parsed.data, body: parsed.content.trimStart() })
  } catch (error) {
    return createResultError(op, `invalid YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`)
  }
}
