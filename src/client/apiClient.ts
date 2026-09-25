import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { convexUrlGet } from "../app/url/convexUrlGet.js"
import type { EventItem } from "../events/EventItem.js"
import type { EventTicketTier } from "../events/EventTicketTier.js"

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
    // Assemble the legacy full EventItem outside Convex: each backend invocation
    // reads only a bounded cursor page, including for events with 51+ tiers.
    const event = await client.query(api.catalog.catalogEventGetPublishedSummaryQuery, { eventKey })
    if (!event) return { success: true, data: null }

    const tiers: EventItem["tiers"][number][] = []
    let cursor: string | null = null
    while (true) {
      const result:
        | { success: true; data: { page: readonly EventTicketTier[]; isDone: boolean; continueCursor: string } | null }
        | { success: false; errorMessage: string } = await client.query(
        api.catalog.catalogEventTierListPublishedPageQuery,
        {
          eventKey,
          paginationOpts: { numItems: 50, cursor },
        },
      )
      if (!result.success) return { success: false, error: { status: 503, message: result.errorMessage } }
      if (!result.data) return { success: true, data: null }
      tiers.push(...result.data.page)
      if (result.data.isDone) break
      if (cursor === result.data.continueCursor) {
        return { success: false, error: { status: 503, message: "Tier pagination did not advance" } }
      }
      cursor = result.data.continueCursor
    }
    tiers.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0))
    const { tiersComplete: _tiersComplete, ...completeEvent } = event
    return {
      success: true,
      data: {
        ...completeEvent,
        tiers,
        soldOut: tiers.length > 0 && tiers.every((tier) => tier.available === 0),
      },
    }
  } catch (error) {
    return {
      success: false,
      error: { status: 503, message: apiClientErrorMessageGet(error) },
    }
  }
}

export const apiClient = apiClientCreate
