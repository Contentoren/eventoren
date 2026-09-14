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
      error: { status: 503, message: error instanceof Error ? error.message : String(error) },
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
      error: { status: 503, message: error instanceof Error ? error.message : String(error) },
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
      error: { status: 503, message: error instanceof Error ? error.message : String(error) },
    }
  }
}

export const apiClient = apiClientCreate
