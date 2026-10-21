import { organizerContractsCurrentCheck } from "../contracts/organizerContractsCurrentCheck.ts"
import { createResult, createResultError, type Result } from "#result"
import type { Doc } from "#convex/_generated/dataModel.js"
import { organizerDashboardIbanValidate } from "#src/organizer/dashboard/model/organizerDashboardIbanValidate.ts"
import { organizerDashboardPricingIsReady } from "#src/organizer/dashboard/pricing/organizerDashboardPricingIsReady.ts"

type DashboardOrganization = Doc<"organizerDashboardOrganizations">

/**
 * Activation readiness shared by approve and unblock-to-aktiv: complete
 * bank/IBAN plus accepted contracts plus admin-confirmed tax+fee config.
 * The structured imprint is deliberately not required until the next phase.
 */
export function organizerDashboardAdminActivationCheck(organization: DashboardOrganization): Result<void> {
  const op = "organizerDashboardAdminActivationCheck"
  const bank = organization.bank
  if (!bank || !organizerDashboardIbanValidate(bank.iban) || bank.holder.trim().length === 0) {
    return createResultError(op, "Activation requires a complete bank account with valid IBAN")
  }
  if (!organizerContractsCurrentCheck(organization.contracts)) {
    return createResultError(
      op,
      "Activation requires current revisioned organizer contracts; legacy timestamps alone are insufficient",
    )
  }
  if (!organization.configurationConfirmed) {
    return createResultError(op, "Activation requires admin-confirmed tax and fee configuration")
  }
  if (!organizerDashboardPricingIsReady(organization)) {
    return createResultError(op, "Activation is blocked while ticket prices are being updated")
  }
  return createResult(undefined)
}
