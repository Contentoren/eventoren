import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"

/** Merge draft activation codes into a quantity-only URL-resolved cart. URL quantities win; codes never enter the URL. */
export function ticketCartActivationCodeMerge(
  resolved: TicketCart,
  draft: TicketCartDraft | readonly TicketCart[] | TicketCart | undefined,
): TicketCart {
  const drafts: readonly TicketCart[] = !draft ? [] : "eventId" in draft ? [draft] : draft
  const matching = drafts.find((entry) => entry.eventId === resolved.eventId)
  if (!matching) return resolved
  const codes = new Map<string, string>()
  for (const line of matching.lines) {
    if (codes.has(line.tierId) || !line.activationCode) continue
    const normalized = ticketActivationCodeNormalize(line.activationCode)
    if (normalized.length > 0) codes.set(line.tierId, normalized)
  }
  if (codes.size === 0) return resolved
  return {
    ...resolved,
    lines: resolved.lines.map((line) => {
      if (line.activationCode) {
        const normalized = ticketActivationCodeNormalize(line.activationCode)
        return normalized.length > 0 ? { ...line, activationCode: normalized } : line
      }
      const code = codes.get(line.tierId)
      return code ? { ...line, activationCode: code } : line
    }),
  }
}
