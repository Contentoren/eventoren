import { apiClientCatalogEventGetPublished, apiClientCreate } from "../client/apiClient.js"
import type { ApiClientResult } from "../client/apiClient.js"
import type { EventItem } from "../events/EventItem.js"
import { convexUrlGet } from "./convexUrlGet.js"

const catalogEventsForCartGetMaxEventKeys = 20

export function catalogEventsForCartGet(input: {
  readonly eventKeys: readonly string[]
  readonly context?: { readonly convexUrl?: string }
}): Promise<ApiClientResult<readonly EventItem[]>> {
  const eventKeys = [...new Set(input.eventKeys)]
  if (eventKeys.length > catalogEventsForCartGetMaxEventKeys) {
    return Promise.resolve({ success: false, error: { status: 400, message: "Too many cart events" } })
  }
  if (eventKeys.length === 0) return Promise.resolve({ success: true, data: [] })

  const client = apiClientCreate(input.context?.convexUrl ?? convexUrlGet())
  return Promise.all(eventKeys.map((eventKey) => apiClientCatalogEventGetPublished(eventKey, client))).then(
    (results) => {
      const failure = results.find((result) => !result.success)
      if (failure && !failure.success) return failure
      return {
        success: true,
        data: results.flatMap((result) => (result.success && result.data ? [result.data] : [])),
      }
    },
  )
}
