import { createFileRoute } from "@tanstack/solid-router"
import type { EventFilter } from "#src/events/EventFilter.ts"
import { eventDiscoverySearchParse } from "#src/events/eventDiscoverySearchParse.ts"
import { catalogEventListPublishedPagePublicCachedGet } from "#src/server/catalogEventListPublishedPagePublicCachedGet.ts"
import { cataloguePublicHttpCacheGet } from "#src/server/cataloguePublicHttpCacheGet.ts"
import { catalogueHttpResponseCreate } from "#src/server/catalogueHttpResponseCreate.ts"

export const Route = createFileRoute("/api/catalogue")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        return cataloguePublicHttpCacheGet({
          request,
          cache: (
            globalThis as typeof globalThis & {
              caches?: {
                default?: {
                  match: (request: Request) => Promise<Response | undefined | null>
                  put: (request: Request, response: Response) => Promise<void>
                }
              }
            }
          ).caches?.default,
          responseGet: async () => {
            const url = new URL(request.url)
            const search = eventDiscoverySearchParse(Object.fromEntries(url.searchParams))
            const filter: EventFilter = {
              query: search.q ?? "",
              location: search.ort ?? "",
              category: search.kategorie ?? "alle",
              timeWindow: search.zeitraum ?? "alle",
            }
            const result = await catalogEventListPublishedPagePublicCachedGet({ filter })
            return catalogueHttpResponseCreate(result)
          },
        })
      },
    },
  },
  component: () => null,
})
