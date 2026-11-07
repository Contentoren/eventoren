import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import { createResult, createResultError, type Result } from "#result"
import type { ContentArticleHtml } from "./ContentArticleHtml.ts"
import { contentCollectionFromPath } from "./contentCollectionFromPath.ts"

export type { ContentHeading } from "./ContentHeading.ts"
export type ContentReadResult = ContentArticleHtml

/** Compiled HTML of an entry (server-side; lazily imports the generated article bodies). */
export async function contentRead(entry: Pick<ContentEntry, "contentPath" | "id">): Promise<Result<ContentReadResult>> {
  const op = "contentRead"
  const collection = contentCollectionFromPath(entry.contentPath)
  if (collection === undefined) return createResultError(op, `Unknown content collection for ${entry.contentPath}`)
  const { contentArticleBodyList } = await import("./contentArticleBodyList.ts")
  const body = contentArticleBodyList[collection][entry.id]
  if (body === undefined) return createResultError(op, `Compiled content not found for ${entry.contentPath}`)
  return createResult({ html: body.html, headings: body.headings, publicPath: body.publicPath })
}
