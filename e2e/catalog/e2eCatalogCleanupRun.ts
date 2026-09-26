import { ConvexHttpClient } from "convex/browser"
import { api } from "../../convex/_generated/api.js"
import type { E2eCheckpoint } from "../checkpoint/e2eCheckpointSchema.ts"
import { e2eCatalogCleanupScan } from "./e2eCatalogCleanupScan.ts"

/** Explicit admin-token invocation; catalog archival does not complete provider reconciliation. */
export async function e2eCatalogCleanupRun(input: {
  directory: string
  target: Pick<E2eCheckpoint, "target" | "baseUrl">
  convexUrl: string
  adminToken: string
}) {
  const client = new ConvexHttpClient(input.convexUrl)
  return e2eCatalogCleanupScan({
    directory: input.directory,
    target: input.target,
    cleanup: (fixture) =>
      client.mutation(api.catalog.catalogE2eCleanupMutation, { ...fixture, token: input.adminToken }),
  })
}
