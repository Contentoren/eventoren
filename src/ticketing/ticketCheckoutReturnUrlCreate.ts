import { createResult, createResultError, type Result } from "#result"

export function ticketCheckoutReturnUrlCreate(appOrigin: string, checkoutKey: string): Result<string> {
  const op = "ticketCheckoutReturnUrlCreate"
  try {
    const origin = new URL(appOrigin)
    if ((origin.protocol !== "http:" && origin.protocol !== "https:") || origin.username || origin.password)
      return createResultError(op, "Die Eventoren-Adresse ist ungültig.")
    const returnUrl = new URL("/checkout", origin.origin)
    returnUrl.searchParams.set("checkout", checkoutKey)
    return createResult(returnUrl.toString())
  } catch (error) {
    return createResultError(op, "Die Eventoren-Adresse ist ungültig.", String(error))
  }
}
