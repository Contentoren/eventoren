import { notFound } from "@tanstack/solid-router"
import type { ContentArticlePageData } from "./ContentArticlePageData.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"

/**
 * TanStack loader glue for article routes: unknown or unpublished slugs become the router's 404,
 * other failures surface through the route error boundary (framework convention, not a Result).
 * The page loader (server-function client and metadata lists) is imported lazily: route loaders live in the
 * eagerly loaded route tree, so a static import would ship them in the main entry chunk of every page.
 */
export async function contentArticleRouteLoad(
  collection: ContentCollection,
  slug: string,
): Promise<ContentArticlePageData> {
  const { contentArticlePageLoad } = await import("./contentArticlePageLoad.ts")
  const result = await contentArticlePageLoad(collection, slug)
  if (result.success) return result.data
  if (result.httpStatus === 404 || result.httpStatus === 400) throw notFound()
  throw new Error(`${result.op}: ${result.errorMessage}`)
}
