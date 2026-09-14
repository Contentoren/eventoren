import { contentHtml } from "./contentHtml.js"
import type { ContentEntry } from "./contentList.js"
import type { ContentHtml } from "./contentHtml.js"

export type { ContentHeading } from "./contentHtml.js"
export type ContentReadResult = ContentHtml

export async function contentRead(entry: Pick<ContentEntry, "contentPath">): Promise<ContentReadResult> {
  const result = contentHtml[entry.contentPath]
  if (result === undefined) throw new Error(`Compiled content not found for path: ${entry.contentPath}`)
  return result
}
