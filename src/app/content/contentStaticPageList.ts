import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import { contentCollectionList } from "./contentCollectionList.ts"
import { contentCollectionSchema } from "./contentCollectionSchema.ts"
import { contentTodayRead } from "./contentTodayRead.ts"

/**
 * Paths prerendered at build: both hubs plus every article published on `today` (Europe/Berlin).
 * Future-dated entries are left out so drafts never ship as static HTML; they go live on the next build.
 */
export function contentStaticPageList(today: string = contentTodayRead()): { readonly path: string }[] {
  return contentCollectionSchema.options.flatMap((collection) => [
    { path: contentCollectionConfig[collection].pathBase },
    ...contentCollectionList(collection, today).map((item) => ({ path: item.entry.path })),
  ])
}
