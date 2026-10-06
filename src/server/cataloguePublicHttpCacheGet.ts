type CatalogueHttpCache = {
  match(request: Request): Promise<Response | undefined | null>
  put(request: Request, response: Response): Promise<void>
}

export async function cataloguePublicHttpCacheGet(input: {
  readonly request: Request
  readonly cache?: CatalogueHttpCache
  readonly responseGet: () => Promise<Response>
}) {
  const cache = input.cache
  if (cache !== undefined) {
    try {
      const cachedResponse = await cache.match(input.request)
      if (cachedResponse != null) return cataloguePublicHttpCacheMark(cachedResponse, "HIT")
    } catch {
      // Cache failures must not make the public catalogue unavailable.
    }
  }

  let response: Response
  try {
    response = await input.responseGet()
  } catch {
    return cataloguePublicHttpCacheMark(
      Response.json(
        { error: "Public catalogue data is temporarily unavailable." },
        {
          status: 503,
          headers: { "cache-control": "no-store" },
        },
      ),
      "BYPASS",
    )
  }
  if (
    response.status !== 200 ||
    cache === undefined ||
    response.headers.get("cache-control")?.includes("s-maxage=60") !== true
  ) {
    return cataloguePublicHttpCacheMark(response, "BYPASS")
  }

  try {
    await cache.put(input.request, response.clone())
  } catch {
    // Cache writes are best-effort; the origin response is still valid.
  }
  return cataloguePublicHttpCacheMark(response, "MISS")
}

function cataloguePublicHttpCacheMark(response: Response, status: "HIT" | "MISS" | "BYPASS") {
  const headers = new Headers(response.headers)
  headers.set("x-public-catalogue-cache", status)
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}
