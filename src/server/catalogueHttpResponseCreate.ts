import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"

export function catalogueHttpResponseCreate(
  result:
    | { readonly success: true; readonly data: CatalogEventListPublishedPage }
    | { readonly success: false; readonly error: { readonly status: number; readonly message: string } },
) {
  if (!result.success) {
    return Response.json(
      { error: "Public catalogue data is temporarily unavailable." },
      {
        status: 503,
        headers: { "cache-control": "no-store" },
      },
    )
  }
  return Response.json(result.data, {
    headers: { "cache-control": "public, max-age=60, s-maxage=60" },
  })
}
