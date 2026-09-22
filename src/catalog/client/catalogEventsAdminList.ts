import type { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { AdminEventItem } from "#src/admin/AdminEventItem.ts"
import { apiClientCreate } from "../../client/apiClient.ts"
import { createResult } from "../../ui/createResult.ts"
import { createResultError } from "../../ui/createResultError.ts"
import type { Result } from "../../ui/Result.ts"

const pageSize = 50

export async function catalogEventsAdminList(
  token: string,
  client: ConvexHttpClient = apiClientCreate(),
): Promise<Result<readonly AdminEventItem[]>> {
  const op = "catalogEventsAdminList"
  const events: AdminEventItem[] = []
  let cursor: string | null = null

  try {
    do {
      const response: Result<{
        readonly page: readonly AdminEventItem[]
        readonly isDone: boolean
        readonly continueCursor: string
      }> = await client.query(api.catalog.catalogEventListAdminPageQuery, {
        token,
        paginationOpts: { numItems: pageSize, cursor },
      })
      if (!response.success) return createResultError(op, response.errorMessage, response)
      events.push(...response.data.page)
      cursor = response.data.isDone ? null : response.data.continueCursor
    } while (cursor !== null)
    return createResult(events)
  } catch (error) {
    return createResultError(op, "Admin-Veranstaltungen konnten nicht geladen werden.", error)
  }
}
