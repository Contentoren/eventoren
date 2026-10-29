import type { ConvexHttpClient } from "convex/browser"
import * as v from "valibot"
import { api } from "#convex/_generated/api.js"
import { createResultError } from "#result"
import {
  type CatalogEventDuplicateInput,
  catalogEventDuplicateInputSchema,
} from "#src/catalog/catalogEventDuplicateInputSchema.ts"
import { apiClientCreate } from "#src/client/apiClient.ts"

export async function catalogEventDuplicate(
  input: CatalogEventDuplicateInput,
  client: ConvexHttpClient = apiClientCreate(),
) {
  const op = "catalogEventDuplicate"
  const parsed = v.safeParse(catalogEventDuplicateInputSchema, input)
  if (!parsed.success) return createResultError(op, v.summarize(parsed.issues))
  try {
    return await client.mutation(api.catalog.eventDuplicate, parsed.output)
  } catch {
    return createResultError(op, "Duplicate service unavailable")
  }
}
