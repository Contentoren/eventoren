/** Whole-cent total for a box-office sale line. */
export function organizerDashboardBoxOfficeSaleTotalCompute(inputs: {
  readonly quantity: number
  readonly unitPriceCents: number
}): number {
  return inputs.quantity * inputs.unitPriceCents
}
