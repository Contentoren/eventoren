import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"

/**
 * Binds every admission mutation once while the setup owner still holds the
 * Convex client and auth contexts. Tokens resolve live at invocation.
 */
export function veranstalterDashboardEinlassMutationsCreate() {
  const checkinRun = mutationCreate(api.organizerDashboardAdmission.organizerDashboardAdmissionCheckInMutation)
  const revokeRun = mutationCreate(api.organizerDashboardAdmission.organizerDashboardAdmissionCheckInRevokeMutation)
  const linkCreateRun = mutationCreate(
    api.organizerDashboardAdmission.organizerDashboardAdmissionScannerLinkCreateMutation,
  )
  const linkRevokeRun = mutationCreate(
    api.organizerDashboardAdmission.organizerDashboardAdmissionScannerLinkRevokeMutation,
  )

  return {
    checkin: (orgId: string, eventKey: string, entrance: string, ticketCode: string) =>
      checkinRun({ orgId: orgId as Id<"orgs">, eventKey, entrance, ticketCode }),
    revoke: (orgId: string, eventKey: string, entrance: string, ticketCode: string) =>
      revokeRun({ orgId: orgId as Id<"orgs">, eventKey, entrance, ticketCode }),
    createLink: (orgId: string, eventKey: string, label: string, entrance: string, expiresAt: number) =>
      linkCreateRun({
        orgId: orgId as Id<"orgs">,
        eventKey,
        label,
        ...(entrance.trim() ? { entrance: entrance.trim() } : {}),
        expiresAt,
      }),
    revokeLink: (orgId: string, linkId: string) =>
      linkRevokeRun({ orgId: orgId as Id<"orgs">, linkId: linkId as Id<"scannerLinks"> }),
  }
}

export type VeranstalterDashboardEinlassMutations = ReturnType<typeof veranstalterDashboardEinlassMutationsCreate>
