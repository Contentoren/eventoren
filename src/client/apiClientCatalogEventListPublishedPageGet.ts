import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { CatalogEventListPublishedPage } from "../catalog/CatalogEventListPublishedPage.ts"
import type { EventFilter } from "../events/EventFilter.ts"
import { apiClientCreate, type ApiClientResult } from "./apiClient.ts"

export async function apiClientCatalogEventListPublishedPageGet(
  input: {
    readonly filter: EventFilter
    readonly paginationOpts: { readonly numItems: number; readonly cursor: string | null }
  },
  client: ConvexHttpClient = apiClientCreate(),
): Promise<ApiClientResult<CatalogEventListPublishedPage>> {
  try {
    const response = await client.query(api.catalog.catalogEventListPublishedPageQuery, input)
    if (response.success) return { success: true, data: response.data }
    return { success: false, error: { status: 503, message: response.errorMessage } }
  } catch (error) {
    return { success: false, error: { status: 503, message: apiClientErrorMessageGet(error) } }
  }
}

function apiClientErrorMessageGet(error: unknown): string {
  if (error instanceof Error) return error.message
  if (typeof error === "string") return error
  if (error !== null && typeof error === "object") {
    const message = "message" in error ? error.message : undefined
    if (typeof message === "string") return message
    return JSON.stringify(error) ?? "Unknown API error"
  }
  return String(error)
}
