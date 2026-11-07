import { createServerFn } from "@tanstack/solid-start"
import * as a from "valibot"
import { createResultError, type ResultOk } from "#result"
import type { ContentArticle } from "../ContentArticle.ts"
import type { ContentArticleLoadError } from "../ContentArticleLoadError.ts"
import { contentArticleLoadInputSchema } from "../contentArticleLoadInputSchema.ts"
import { contentErrorCatalog } from "../contentErrorCatalog.ts"

/**
 * Server function for route loaders: `await contentArticleLoad({ data: { collection, slug } })`.
 * The handler and the generated article bodies it imports only run on the server.
 */
export const contentArticleLoad = createServerFn({ method: "GET" })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<ResultOk<ContentArticle> | ContentArticleLoadError> => {
    const op = "contentArticleLoad"
    const parsed = a.safeParse(contentArticleLoadInputSchema, data)
    if (!parsed.success)
      return {
        ...createResultError(op, a.summarize(parsed.issues), JSON.stringify(data) ?? null),
        ...contentErrorCatalog.invalidRequest,
      }
    const { contentArticleRead } = await import("../contentArticleRead.ts")
    return contentArticleRead(parsed.output.collection, parsed.output.slug)
  })
