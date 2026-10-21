import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import type { OrganizerDashboardOrderBuyerContactInput } from "#src/organizer/dashboard/orders/model/organizerDashboardOrderBuyerContactSchema.ts"
import type { OrganizerDashboardOrderParticipantUpdate } from "#src/organizer/dashboard/orders/model/organizerDashboardOrderParticipantUpdateSchema.ts"

/**
 * Binds every organizer order mutation once while the setup owner still holds
 * the Convex client and auth contexts. The returned wrappers keep only the
 * client and the reactive auth accessors, so handler-time calls resolve the
 * token live at invocation instead of re-entering `useContext` ownerless.
 */
export function veranstalterDashboardOrderMutationsCreate() {
  const createNoteRun = mutationCreate(api.organizerDashboardOrders.organizerDashboardOrderNoteCreateMutation)
  const deleteNoteRun = mutationCreate(api.organizerDashboardOrders.organizerDashboardOrderNoteDeleteMutation)
  const buyerContactRun = mutationCreate(api.organizerDashboardOrders.organizerDashboardOrderBuyerContactUpdateMutation)
  const participantRun = mutationCreate(api.organizerDashboardOrders.organizerDashboardOrderParticipantUpdateMutation)

  return {
    createNote: (orgId: string, orderId: string, text: string) =>
      createNoteRun({
        orgId: orgId as Id<"orgs">,
        orderId: orderId as Id<"ticketOrders">,
        text,
      }),
    deleteNote: (orgId: string, orderId: string, noteId: string) =>
      deleteNoteRun({
        orgId: orgId as Id<"orgs">,
        orderId: orderId as Id<"ticketOrders">,
        noteId: noteId as Id<"organizerDashboardOrderNotes">,
      }),
    updateBuyerContact: (orgId: string, orderId: string, contact: OrganizerDashboardOrderBuyerContactInput) =>
      buyerContactRun({
        orgId: orgId as Id<"orgs">,
        orderId: orderId as Id<"ticketOrders">,
        ...contact,
      }),
    updateParticipant: (
      orgId: string,
      orderId: string,
      ticketId: string,
      update: OrganizerDashboardOrderParticipantUpdate,
    ) =>
      participantRun({
        orgId: orgId as Id<"orgs">,
        orderId: orderId as Id<"ticketOrders">,
        ticketId: ticketId as Id<"ticketIssued">,
        ...update,
      }),
  }
}

export type VeranstalterDashboardOrderMutations = ReturnType<typeof veranstalterDashboardOrderMutationsCreate>
