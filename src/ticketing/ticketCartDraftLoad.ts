import type { TicketCart } from "./TicketCart.ts"
import type { TicketCartDraft } from "./TicketCartDraft.ts"
import { ticketCartDraftKey } from "./ticketCartDraftKey.ts"
import { ticketCartSearchParse } from "./ticketCartSearchParse.ts"

const isTicketCart = (value: unknown): value is TicketCart => {
  if (typeof value !== "object" || value === null) return false

  const candidate = value as { eventId?: unknown; lines?: unknown }
  if (typeof candidate.eventId !== "string" || candidate.eventId.length === 0) return false
  if (!Array.isArray(candidate.lines)) return false

  return candidate.lines.every((line) => {
    if (typeof line !== "object" || line === null) return false
    const candidateLine = line as { tierId?: unknown; quantity?: unknown }
    return (
      typeof candidateLine.tierId === "string" &&
      candidateLine.tierId.length > 0 &&
      typeof candidateLine.quantity === "number" &&
      Number.isFinite(candidateLine.quantity) &&
      candidateLine.quantity >= 0
    )
  })
}

export function ticketCartDraftLoad(): TicketCartDraft {
  if (typeof localStorage === "undefined") return []

  let raw: string | null = null
  try {
    raw = localStorage.getItem(ticketCartDraftKey)
  } catch {
    return []
  }
  if (raw === null) return []

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch {
    return []
  }
  if (typeof parsed !== "object" || parsed === null) return []

  const candidate = parsed as { version?: unknown; carts?: unknown; eventId?: unknown; tickets?: unknown }
  if (candidate.version === 2) {
    if (!Array.isArray(candidate.carts) || !candidate.carts.every(isTicketCart)) return []
    return candidate.carts
  }

  if (typeof candidate.eventId !== "string" || candidate.eventId.length === 0) return []
  if (typeof candidate.tickets !== "string") return []

  const cart = ticketCartSearchParse(candidate.eventId, candidate.tickets)
  if (cart.lines.length === 0) return []
  return [cart]
}
