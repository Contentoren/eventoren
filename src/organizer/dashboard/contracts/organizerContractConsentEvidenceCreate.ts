import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { MutationCtx } from "#convex/_generated/server.js"
import { internal } from "#convex/_generated/api.js"
import { organizerContractDocuments } from "./organizerContractDocuments.ts"
import { organizerContractTextCanonicalCreate } from "./organizerContractTextCanonicalCreate.ts"
import { organizerContractTextDigestCreate } from "./organizerContractTextDigestCreate.ts"

/** Only call after explicit, validated acceptance of both current revisions. */
export async function organizerContractConsentEvidenceCreate(
  ctx: MutationCtx,
  input: Required<
    Pick<
      Doc<"organizerDashboardContractConsents">,
      | "orgId"
      | "acceptedAt"
      | "acceptedByUserId"
      | "party"
      | "acceptedFee"
      | "authorityConfirmed"
      | "earlyServiceStartRequested"
    >
  >,
): Promise<Id<"organizerDashboardContractConsents">> {
  const { terms, dpa } = organizerContractDocuments
  const [termsTextDigest, dpaTextDigest] = await Promise.all([
    organizerContractTextDigestCreate(organizerContractTextCanonicalCreate(terms)),
    organizerContractTextDigestCreate(organizerContractTextCanonicalCreate(dpa)),
  ])
  const evidenceId = await ctx.db.insert("organizerDashboardContractConsents", {
    ...input,
    termsDocumentId: terms.documentId,
    termsRevision: terms.revision,
    dpaDocumentId: dpa.documentId,
    dpaRevision: dpa.revision,
    termsTextDigest,
    dpaTextDigest,
    termsSnapshot: terms.sections.map(([heading, body]) => ({ heading, body })),
    dpaSnapshot: dpa.sections.map(([heading, body]) => ({ heading, body })),
  })
  const deliveryId = await ctx.db.insert("organizerDashboardContractDeliveries", {
    evidenceId,
    status: "pending",
    attempts: 0,
    nextAttemptAt: Date.now(),
    updatedAt: Date.now(),
  })
  await ctx.scheduler.runAfter(0, internal.organizerContractEmail.organizerContractConfirmationSendInternalAction, {
    deliveryId,
  })
  return evidenceId
}
