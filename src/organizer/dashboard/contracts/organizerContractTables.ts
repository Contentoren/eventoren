import { defineTable } from "convex/server"
import { v as convexV } from "convex/values"
import * as v from "valibot"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { organizerContractTextSnapshotSchema } from "./organizerContractTextSnapshotSchema.ts"

/** Evidence is insert-only: no mutation may rewrite or delete an earlier acceptance. */
export const organizerContractTables = {
  organizerDashboardContractConsents: defineTable({
    orgId: vIdOrg,
    ...valibotToConvex({
      termsDocumentId: v.string(),
      termsRevision: v.string(),
      dpaDocumentId: v.string(),
      dpaRevision: v.string(),
      termsTextDigest: v.string(),
      dpaTextDigest: v.string(),
      termsSnapshot: organizerContractTextSnapshotSchema,
      dpaSnapshot: organizerContractTextSnapshotSchema,
      acceptedAt: v.string(),
    }),
    acceptedByUserId: convexV.id("users"),
  }).index("orgIdAt", ["orgId", "acceptedAt"]),
}
