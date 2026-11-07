import * as a from "valibot"
import { createResult, createResultError, type ResultOk } from "#result"
import type { ContentArticle } from "./ContentArticle.ts"
import type { ContentArticleLoadError } from "./ContentArticleLoadError.ts"
import { contentArticleLoadInputSchema } from "./contentArticleLoadInputSchema.ts"
import { contentErrorCatalog } from "./contentErrorCatalog.ts"
import { contentListItemFind } from "./contentListItemFind.ts"
import { contentTodayRead } from "./contentTodayRead.ts"

/**
 * Server-side article read: published entry + meta from the client-safe lists, body (html, headings, faq)
 * from the generated server-only module, imported lazily so it never lands in the client bundle.
 */
export async function contentArticleRead(
  collection: string,
  slug: string,
  today: string = contentTodayRead(),
): Promise<ResultOk<ContentArticle> | ContentArticleLoadError> {
  const op = "contentArticleRead"
  const parsed = a.safeParse(contentArticleLoadInputSchema, { collection, slug })
  if (!parsed.success)
    return {
      ...createResultError(op, a.summarize(parsed.issues), JSON.stringify({ collection, slug })),
      ...contentErrorCatalog.invalidRequest,
    }

  const item = contentListItemFind(parsed.output.collection, parsed.output.slug, today)
  if (item === undefined)
    return { ...createResultError(op, "Article not found"), ...contentErrorCatalog.articleNotFound }

  const { contentArticleBodyList } = await import("./contentArticleBodyList.ts")
  const body = contentArticleBodyList[parsed.output.collection][item.entry.id]
  if (body === undefined)
    return { ...createResultError(op, "Compiled article body missing"), ...contentErrorCatalog.bodyMissing }

  return createResult({ entry: item.entry, meta: item.meta, html: body.html, headings: body.headings, faq: body.faq })
}
