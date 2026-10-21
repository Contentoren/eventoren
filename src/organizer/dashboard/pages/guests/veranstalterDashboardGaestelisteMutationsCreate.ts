import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { organizerDashboardGuestReferences } from "../../api/organizerDashboardGuestReferences.ts"

/**
 * Binds every guest-list mutation once while the setup owner still holds the
 * Convex client and auth contexts. Handler-time calls resolve the token live
 * at invocation instead of re-entering `useContext` ownerless.
 */
export function veranstalterDashboardGaestelisteMutationsCreate() {
  const quotaUpsertRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestQuotaUpsertMutation)
  const quotaDeleteRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestQuotaDeleteMutation)
  const guestUpsertRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestUpsertMutation)
  const guestDeleteRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestDeleteMutation)
  const ticketSendRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestTicketSendMutation)
  const checkInRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestCheckInMutation)
  const checkInUndoRun = mutationCreate(organizerDashboardGuestReferences.organizerDashboardGuestCheckInUndoMutation)

  return {
    quotaUpsert: (orgId: string, eventKey: string, quota: { name: string; limit: number }) =>
      quotaUpsertRun({ orgId: orgId as Id<"orgs">, eventKey, ...quota }),
    quotaDelete: (orgId: string, quotaId: string) =>
      quotaDeleteRun({ orgId: orgId as Id<"orgs">, quotaId: quotaId as Id<"organizerDashboardGuestQuotas"> }),
    guestUpsert: (
      orgId: string,
      eventKey: string,
      guest: { name: string; email?: string; plusOnes: number; note?: string; quotaId?: string },
    ) =>
      guestUpsertRun({
        orgId: orgId as Id<"orgs">,
        eventKey,
        name: guest.name,
        ...(guest.email ? { email: guest.email } : {}),
        plusOnes: guest.plusOnes,
        ...(guest.note ? { note: guest.note } : {}),
        ...(guest.quotaId ? { quotaId: guest.quotaId } : {}),
      }),
    guestDelete: (orgId: string, guestId: string) =>
      guestDeleteRun({ orgId: orgId as Id<"orgs">, guestId: guestId as Id<"organizerDashboardGuests"> }),
    ticketSend: (orgId: string, guestId: string) =>
      ticketSendRun({ orgId: orgId as Id<"orgs">, guestId: guestId as Id<"organizerDashboardGuests"> }),
    checkIn: (orgId: string, guestId: string, entrance: string) =>
      checkInRun({ orgId: orgId as Id<"orgs">, guestId: guestId as Id<"organizerDashboardGuests">, entrance }),
    checkInUndo: (orgId: string, guestId: string) =>
      checkInUndoRun({ orgId: orgId as Id<"orgs">, guestId: guestId as Id<"organizerDashboardGuests"> }),
  }
}

export type VeranstalterDashboardGaestelisteMutations = ReturnType<
  typeof veranstalterDashboardGaestelisteMutationsCreate
>
