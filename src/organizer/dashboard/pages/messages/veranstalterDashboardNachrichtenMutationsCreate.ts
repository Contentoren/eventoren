import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { organizerDashboardMessageReferences } from "../../api/organizerDashboardMessageReferences.ts"
import type { OrganizerDashboardMessageContent } from "../../messages/organizerDashboardMessageSchema.ts"

/**
 * Binds every message mutation once while the setup owner still holds the
 * Convex client and auth contexts. Handler-time calls resolve the token live
 * at invocation instead of re-entering `useContext` ownerless.
 */
export function veranstalterDashboardNachrichtenMutationsCreate() {
  const createRun = mutationCreate(organizerDashboardMessageReferences.organizerDashboardMessageCreateMutation)
  const updateRun = mutationCreate(organizerDashboardMessageReferences.organizerDashboardMessageUpdateMutation)
  const scheduleRun = mutationCreate(organizerDashboardMessageReferences.organizerDashboardMessageScheduleMutation)
  const sendRun = mutationCreate(organizerDashboardMessageReferences.organizerDashboardMessageSendMutation)
  const deleteRun = mutationCreate(organizerDashboardMessageReferences.organizerDashboardMessageDeleteMutation)
  const reminderRun = mutationCreate(
    organizerDashboardMessageReferences.organizerDashboardMessageReminderUpdateMutation,
  )

  return {
    create: (orgId: string, eventKey: string, content: OrganizerDashboardMessageContent) =>
      createRun({ orgId: orgId as Id<"orgs">, eventKey, ...content }),
    update: (orgId: string, messageId: string, content: OrganizerDashboardMessageContent) =>
      updateRun({
        orgId: orgId as Id<"orgs">,
        messageId: messageId as Id<"organizerDashboardMessages">,
        ...content,
      }),
    schedule: (orgId: string, messageId: string, scheduledAt: string) =>
      scheduleRun({
        orgId: orgId as Id<"orgs">,
        messageId: messageId as Id<"organizerDashboardMessages">,
        scheduledAt,
      }),
    send: (orgId: string, messageId: string) =>
      sendRun({ orgId: orgId as Id<"orgs">, messageId: messageId as Id<"organizerDashboardMessages"> }),
    remove: (orgId: string, messageId: string) =>
      deleteRun({ orgId: orgId as Id<"orgs">, messageId: messageId as Id<"organizerDashboardMessages"> }),
    reminderUpdate: (
      orgId: string,
      eventKey: string,
      reminder: { enabled: boolean; hoursBefore: number; directions: string; calendar: boolean },
    ) => reminderRun({ orgId: orgId as Id<"orgs">, eventKey, ...reminder }),
  }
}

export type VeranstalterDashboardNachrichtenMutations = ReturnType<
  typeof veranstalterDashboardNachrichtenMutationsCreate
>
