export function ticketCheckoutFulfillmentActivationIsEnabled(organizationId: string): boolean {
  const configuredOrganizations = process.env.EVENTOREN_BILLING_FULFILLMENT_ORGANIZATION_ALLOWLIST
  if (!configuredOrganizations) return false
  return configuredOrganizations
    .split(",")
    .map((value) => value.trim())
    .filter((value) => value.length > 0)
    .includes(organizationId)
}
