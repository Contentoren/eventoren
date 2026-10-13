import { createResult, createResultError, type Result } from "#result"

export function ticketCheckoutCancelUrlCreate(appOrigin: string, eventKey?: string): Result<string> {
  const op = "ticketCheckoutCancelUrlCreate"
  try {
    const origin = new URL(appOrigin)
    if ((origin.protocol !== "http:" && origin.protocol !== "https:") || origin.username || origin.password)
      return createResultError(op, "Die Eventoren-Adresse ist ungültig.")
    const pathname = eventKey?.trim() ? `/events/${encodeURIComponent(eventKey.trim())}` : "/warenkorb"
    const cancelUrl = new URL(pathname, origin.origin)
    return createResult(cancelUrl.toString())
  } catch (error) {
    return createResultError(op, "Die Eventoren-Adresse ist ungültig.", String(error))
  }
}
