import type { ConvexHttpClient } from "convex/browser"
import * as v from "valibot"
import { api } from "#convex/_generated/api.js"
import { createResultError } from "#result"
import {
  type CatalogEventArchiveInput,
  catalogEventArchiveInputSchema,
} from "#src/catalog/catalogEventArchiveInputSchema.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"

export async function catalogEventArchive(
  input: CatalogEventArchiveInput,
  client: ConvexHttpClient = apiClientCreate(),
) {
  const op = "catalogEventArchive"
  const parsed = v.safeParse(catalogEventArchiveInputSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  try {
    return await client.mutation(api.catalog.eventArchive, parsed.output)
  } catch {
    return createResultError(op, "Archive service unavailable")
  }
}
