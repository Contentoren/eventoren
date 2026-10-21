import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"

/**
 * Binds every box-office mutation once while the setup owner still holds the
 * Convex client and auth contexts. Tokens resolve live at invocation.
 */
export function veranstalterDashboardAbendkasseMutationsCreate() {
  const createRun = mutationCreate(api.organizerDashboardBoxOffice.organizerDashboardBoxOfficeSaleCreateMutation)
  const cancelRun = mutationCreate(api.organizerDashboardBoxOffice.organizerDashboardBoxOfficeSaleCancelMutation)
  const completeRun = mutationCreate(api.organizerDashboardBoxOffice.organizerDashboardBoxOfficeSaleCompleteMutation)

  return {
    createSale: (
      orgId: string,
      eventKey: string,
      input: { tierKey: string; quantity: number; unitPriceCents?: number; testHarness?: boolean },
    ) =>
      createRun({
        orgId: orgId as Id<"orgs">,
        eventKey,
        tierKey: input.tierKey,
        quantity: input.quantity,
        ...(input.unitPriceCents !== undefined ? { unitPriceCents: input.unitPriceCents } : {}),
        ...(input.testHarness === true ? { testHarness: true as const } : {}),
      }),
    cancelSale: (orgId: string, saleId: string) =>
      cancelRun({ orgId: orgId as Id<"orgs">, saleId: saleId as Id<"organizerDashboardBoxOfficeSales"> }),
    completeSale: (orgId: string, saleId: string, orderId: string) =>
      completeRun({ orgId: orgId as Id<"orgs">, saleId, orderId }),
  }
}

export type VeranstalterDashboardAbendkasseMutations = ReturnType<typeof veranstalterDashboardAbendkasseMutationsCreate>
