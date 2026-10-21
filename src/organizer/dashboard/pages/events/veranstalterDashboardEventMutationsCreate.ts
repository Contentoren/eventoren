import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import type { OrganizerDashboardEventCreate } from "../../events/model/organizerDashboardEventCreateSchema.ts"
import type { OrganizerDashboardEventPatch } from "../../events/model/organizerDashboardEventPatchSchema.ts"
import type { OrganizerDashboardTierUpsert } from "../../events/model/organizerDashboardTierUpsertSchema.ts"

/**
 * Binds every organizer event mutation once while the setup owner still holds
 * the Convex client and auth contexts. The returned wrappers keep only the
 * client and the reactive auth accessors, so handler-time calls resolve the
 * token live at invocation instead of re-entering `useContext` ownerless.
 */
export function veranstalterDashboardEventMutationsCreate() {
  const createEventRun = mutationCreate(api.organizerDashboardEvents.organizerDashboardEventCreateMutation)
  const updateEventRun = mutationCreate(api.organizerDashboardEvents.organizerDashboardEventUpdateMutation)
  const upsertTierRun = mutationCreate(api.organizerDashboardEvents.organizerDashboardTierUpsertMutation)
  const archiveTierRun = mutationCreate(api.organizerDashboardEvents.organizerDashboardTierArchiveMutation)
  const publishEventRun = mutationCreate(api.organizerDashboardEvents.organizerDashboardEventPublishMutation)
  const archiveEventRun = mutationCreate(api.organizerDashboardEvents.organizerDashboardEventArchiveMutation)
  return {
    createEvent: (orgId: string, input: OrganizerDashboardEventCreate) =>
      createEventRun({ orgId: orgId as Id<"orgs">, ...input }),
    updateEvent: (orgId: string, eventKey: string, patch: OrganizerDashboardEventPatch) =>
      updateEventRun({ orgId: orgId as Id<"orgs">, eventKey, ...patch }),
    upsertTier: (
      orgId: string,
      eventKey: string,
      input: OrganizerDashboardTierUpsert & { readonly tierKey?: string },
    ) => upsertTierRun({ orgId: orgId as Id<"orgs">, eventKey, ...input }),
    archiveTier: (orgId: string, eventKey: string, tierKey: string) =>
      archiveTierRun({ orgId: orgId as Id<"orgs">, eventKey, tierKey }),
    publishEvent: (orgId: string, eventKey: string) => publishEventRun({ orgId: orgId as Id<"orgs">, eventKey }),
    archiveEvent: (orgId: string, eventKey: string) => archiveEventRun({ orgId: orgId as Id<"orgs">, eventKey }),
  }
}
