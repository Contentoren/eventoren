import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"

/**
 * Binds every organizer pricing mutation once while the setup owner still
 * holds the Convex client and auth contexts. Callers resolve the token live
 * at invocation instead of re-entering `useContext` ownerless.
 */
export function veranstalterDashboardPreiseMutationsCreate() {
  const phaseUpsertRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardPhaseUpsertMutation)
  const phaseArchiveRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardPhaseArchiveMutation)
  const codeCreateRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardCodeCreateMutation)
  const codeUpdateRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardCodeUpdateMutation)
  const codeDeleteRun = mutationCreate(api.organizerDashboardPricing.organizerDashboardCodeDeleteMutation)

  return {
    upsertPhase: (
      orgId: string,
      eventKey: string,
      input: {
        readonly phaseId?: string | undefined
        readonly tierKey: string
        readonly name: string
        readonly priceCents: number
        readonly endsAt?: string | undefined
        readonly quota?: number | undefined
      },
    ) =>
      phaseUpsertRun({
        orgId: orgId as Id<"orgs">,
        eventKey,
        ...input,
      }),
    archivePhase: (orgId: string, phaseId: string) =>
      phaseArchiveRun({ orgId: orgId as Id<"orgs">, phaseId: phaseId as Id<"organizerDashboardPricePhases"> }),
    createCode: (
      orgId: string,
      eventKey: string,
      input: {
        readonly kind: "rabatt" | "zugang"
        readonly code?: string | undefined
        readonly prefix?: string | undefined
        readonly count?: number | undefined
        readonly discountType?: "prozent" | "betrag" | undefined
        readonly discountValue?: number | undefined
        readonly tierKeys?: readonly string[] | undefined
        readonly maxTickets?: number | undefined
        readonly validFrom?: string | undefined
        readonly validUntil?: string | undefined
        readonly note?: string | undefined
      },
    ) => {
      const { tierKeys, ...rest } = input
      return codeCreateRun({
        orgId: orgId as Id<"orgs">,
        eventKey,
        ...rest,
        ...(tierKeys ? { tierKeys: [...tierKeys] } : {}),
      })
    },
    updateCode: (
      orgId: string,
      codeId: string,
      input: { readonly active?: boolean | undefined; readonly maxTickets?: number | undefined },
    ) =>
      codeUpdateRun({
        orgId: orgId as Id<"orgs">,
        codeId: codeId as Id<"organizerDashboardCodes">,
        ...input,
      }),
    deleteCode: (orgId: string, codeId: string) =>
      codeDeleteRun({ orgId: orgId as Id<"orgs">, codeId: codeId as Id<"organizerDashboardCodes"> }),
  }
}

export type VeranstalterDashboardPreiseMutations = ReturnType<typeof veranstalterDashboardPreiseMutationsCreate>
