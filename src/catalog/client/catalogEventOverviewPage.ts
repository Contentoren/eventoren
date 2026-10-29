import type { ConvexHttpClient } from "convex/browser"
import * as v from "valibot"
import { api } from "#convex/_generated/api.js"
import { createResultError } from "#result"
import {
  type CatalogEventOverviewPageInput,
  catalogEventOverviewPageInputSchema,
} from "#src/catalog/catalogEventOverviewPageInputSchema.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"

export async function catalogEventOverviewPage(
  input: CatalogEventOverviewPageInput,
  client: ConvexHttpClient = apiClientCreate(),
) {
  const op = "catalogEventOverviewPage"
  const parsed = v.safeParse(catalogEventOverviewPageInputSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  try {
    return await client.query(api.catalog.eventOverviewPage, parsed.output)
  } catch {
    return createResultError(op, "Overview service unavailable")
  }
}
