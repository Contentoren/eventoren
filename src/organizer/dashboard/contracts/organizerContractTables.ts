import { defineTable } from "convex/server"
import { organizerContractSnapshotFields } from "./organizerContractSnapshotFields.ts"
import { v as convexV } from "convex/values"
import * as v from "valibot"
import { vIdOrg } from "#src/org/org_convex/vIdOrg.ts"
import { valibotToConvex } from "#src/utils/convex/valibotToConvex.ts"
import { organizerContractTextSnapshotSchema } from "./organizerContractTextSnapshotSchema.ts"

/** Evidence is insert-only: no mutation may rewrite or delete an earlier acceptance. */
export const organizerContractTables = {
  // Private operational state, deliberately separate from immutable consent evidence.
  organizerDashboardContractDeliveries: defineTable({
    evidenceId: convexV.id("organizerDashboardContractConsents"),
    status: convexV.union(
      convexV.literal("pending"),
      convexV.literal("sending"),
      convexV.literal("sent"),
      convexV.literal("failed"),
    ),
    attempts: convexV.number(),
    nextAttemptAt: convexV.number(),
    updatedAt: convexV.number(),
    sentAt: convexV.optional(convexV.number()),
    lastError: convexV.optional(convexV.string()),
  }).index("evidenceId", ["evidenceId"]),
  organizerDashboardContractConsents: defineTable({
    ...organizerContractSnapshotFields,
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
