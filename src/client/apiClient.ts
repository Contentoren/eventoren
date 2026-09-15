import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { convexUrlGet } from "../app/url/convexUrlGet.js"
import type { EventItem } from "../events/EventItem.js"

export type ApiClientError = {
  readonly status: number
  readonly message: string
}

export type ApiClientResult<T> =
  | { readonly success: true; readonly data: T }
  | { readonly success: false; readonly error: ApiClientError }

export type ApiClientPublicProjectInfo = {
  readonly projectName: string
  readonly serverTimestamp: number
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

export function apiClientCreate(url = convexUrlGet()): ConvexHttpClient {
  return new ConvexHttpClient(url)
}

export async function apiClientPublicProjectInfoGet(
  client: ConvexHttpClient = apiClientCreate(),
): Promise<ApiClientResult<ApiClientPublicProjectInfo>> {
  try {
    const data = await client.query(api.publicProjectInfo.publicProjectInfo, {})
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: { status: 503, message: apiClientErrorMessageGet(error) },
    }
  }
}

export async function apiClientCatalogEventListPublishedGet(
  client: ConvexHttpClient = apiClientCreate(),
): Promise<ApiClientResult<readonly EventItem[]>> {
  try {
    const data = await client.query(api.catalog.catalogEventListPublishedQuery, {})
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: { status: 503, message: apiClientErrorMessageGet(error) },
    }
  }
}

export async function apiClientCatalogEventGetPublished(
  eventKey: string,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<ApiClientResult<EventItem | null>> {
  try {
    const data = await client.query(api.catalog.catalogEventGetPublishedQuery, { eventKey })
    return { success: true, data }
  } catch (error) {
    return {
      success: false,
      error: { status: 503, message: apiClientErrorMessageGet(error) },
    }
  }
}

export const apiClient = apiClientCreate
