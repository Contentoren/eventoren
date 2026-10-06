import { expect, test } from "bun:test"
import { cataloguePublicHttpCacheGet } from "../src/server/cataloguePublicHttpCacheGet.ts"

function mockCacheCreate() {
  const entries = new Map<string, Response>()
  return {
    entries,
    cache: {
      match: async (request: Request) => entries.get(request.url)?.clone(),
      put: async (request: Request, response: Response) => {
        entries.set(request.url, response.clone())
      },
    },
  }
}

test("Cloudflare HTTP cache reuses successful catalogue GETs by full URL", async () => {
  const { cache } = mockCacheCreate()
  const request = new Request("https://eventoren.de/api/catalogue?q=music")
  let originReads = 0
  const responseGet = async () => {
    originReads += 1
    return Response.json({ items: [originReads] }, { headers: { "cache-control": "public, max-age=60, s-maxage=60" } })
  }

  const first = await cataloguePublicHttpCacheGet({ request, cache, responseGet })
  const second = await cataloguePublicHttpCacheGet({ request, cache, responseGet })
  const otherQuery = await cataloguePublicHttpCacheGet({
    request: new Request("https://eventoren.de/api/catalogue?q=theatre"),
    cache,
    responseGet,
  })

  expect(first.headers.get("x-public-catalogue-cache")).toBe("MISS")
  expect(second.headers.get("x-public-catalogue-cache")).toBe("HIT")
  expect(await second.json()).toEqual({ items: [1] })
  expect(otherQuery.headers.get("x-public-catalogue-cache")).toBe("MISS")
  expect(originReads).toBe(2)
})

test("catalogue HTTP cache never stores error or non-cacheable responses", async () => {
  const { cache, entries } = mockCacheCreate()
  const request = new Request("https://eventoren.de/api/catalogue?q=broken")
  const response = await cataloguePublicHttpCacheGet({
    request,
    cache,
    responseGet: async () =>
      Response.json({ error: "unavailable" }, { status: 503, headers: { "cache-control": "no-store" } }),
  })

  expect(response.status).toBe(503)
  expect(response.headers.get("cache-control")).toBe("no-store")
  expect(response.headers.get("x-public-catalogue-cache")).toBe("BYPASS")
  expect(entries.size).toBe(0)
})
