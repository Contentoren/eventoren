import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCheckoutCreateInput } from "./TicketCheckoutCreateInput.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"
import { ticketCheckoutRetryStorageLoad } from "./ticketCheckoutRetryStorageLoad.ts"
import { ticketCheckoutRetryStorageSave } from "./ticketCheckoutRetryStorageSave.ts"
import type { TicketCheckoutRetryStored } from "./ticketCheckoutRetryStoredSchema.ts"

type CheckoutTicketLike = {
  readonly tierKey: string
  readonly quantity: number
  readonly activationCode?: string
  readonly activationCodeHoldToken?: string
  readonly participantNames?: readonly string[]
}

type CheckoutMaterialLike = {
  readonly eventKey: string
  readonly catalogVersion: number
  readonly eventRevision: number
  readonly tickets: readonly CheckoutTicketLike[]
  readonly successUrl: string
  readonly cancelUrl: string
  readonly locale: "de" | "en"
  readonly customer: unknown
  readonly legalContext: unknown
}

/**
 * Material input of a retry lookup. The checkout URLs are optional here: the
 * lookup runs before a checkout key exists, so the caller passes the URL
 * context of the current attempt separately.
 */
type CheckoutLookupMaterialLike = Omit<CheckoutMaterialLike, "successUrl" | "cancelUrl"> & {
  readonly successUrl?: string
  readonly cancelUrl?: string
}

const materialFields = [
  "eventKey",
  "catalogVersion",
  "eventRevision",
  "tickets",
  "successUrl",
  "cancelUrl",
  "locale",
  "customer",
  "legalContext",
] as const

/**
 * Query parameter that carries the generated checkout key. It is minted per
 * attempt and holds no auditable evidence, so a lookup never compares it.
 */
const checkoutKeyParam = "checkout"

function ticketCheckoutRetryTicketsOf(tickets: readonly CheckoutTicketLike[]) {
  return [...tickets]
    .sort((left, right) => left.tierKey.localeCompare(right.tierKey))
    .map((ticket) => ({
      tierKey: ticket.tierKey,
      quantity: ticket.quantity,
      ...(ticket.activationCode !== undefined
        ? { activationCode: ticketActivationCodeNormalize(ticket.activationCode) }
        : {}),
      ...(ticket.participantNames !== undefined ? { participantNames: [...ticket.participantNames] } : {}),
    }))
}

/**
 * Canonical material key of a checkout input. Only code-bound orders are
 * retryable, so the key stays byte-stable for unchanged code orders and
 * changes whenever any auditable evidence changes. The hold credential is
 * not evidence: the stored payload carries the credential, the key does not.
 */
export function ticketCheckoutRetryMaterialKey(input: CheckoutMaterialLike): string {
  return JSON.stringify({
    eventKey: input.eventKey,
    catalogVersion: input.catalogVersion,
    eventRevision: input.eventRevision,
    tickets: ticketCheckoutRetryTicketsOf(input.tickets),
    successUrl: input.successUrl,
    cancelUrl: input.cancelUrl,
    locale: input.locale,
    customer: input.customer,
    legalContext: input.legalContext,
  })
}

/**
 * Lookup identity of a checkout URL. Only the generated checkout key query
 * parameter is normalized away, because its value is minted per attempt and
 * the lookup runs before a key exists. Origin, path and every other query
 * parameter stay in the identity, so a changed external URL never silently
 * replays the evidence of another checkout.
 */
export function ticketCheckoutRetryUrlLookupIdentity(url: string): string {
  try {
    const parsed = new URL(url)
    parsed.searchParams.delete(checkoutKeyParam)
    parsed.searchParams.sort()
    const search = parsed.searchParams.toString()
    return `${parsed.origin}${parsed.pathname}${search ? `?${search}` : ""}`
  } catch {
    return url
  }
}

/**
 * Lookup key of a material input. It compares the auditable evidence with
 * the URL lookup identities, so the generated checkout key of either side
 * stays out of the comparison while every other URL part stays in.
 */
function ticketCheckoutRetryLookupKey(
  input: CheckoutLookupMaterialLike,
  urls: { readonly successUrl: string; readonly cancelUrl: string },
): string {
  return JSON.stringify({
    eventKey: input.eventKey,
    catalogVersion: input.catalogVersion,
    eventRevision: input.eventRevision,
    tickets: ticketCheckoutRetryTicketsOf(input.tickets),
    successUrl: ticketCheckoutRetryUrlLookupIdentity(urls.successUrl),
    cancelUrl: ticketCheckoutRetryUrlLookupIdentity(urls.cancelUrl),
    locale: input.locale,
    customer: input.customer,
    legalContext: input.legalContext,
  })
}

/** True when at least one ticket line carries a normalized activation code. */
export function ticketCheckoutRetryHasCode(input: { readonly tickets: readonly CheckoutTicketLike[] }): boolean {
  return input.tickets.some((ticket) => (ticket.activationCode ?? "").trim().length > 0)
}

function materialInputOf(record: TicketCheckoutRetryStored): CheckoutMaterialLike | undefined {
  const payload = record.checkoutInput as Record<string, unknown>
  const tickets = payload.tickets
  if (!Array.isArray(tickets)) return undefined
  const material: Record<string, unknown> = {}
  for (const field of materialFields) material[field] = (payload as Record<string, unknown>)[field]
  return { ...(material as unknown as CheckoutMaterialLike), tickets: tickets as CheckoutTicketLike[] }
}

/**
 * Loads the stored retry snapshot for the exact material input, or undefined
 * when the current booking differs. The lookup runs before a checkout key
 * exists, so the caller passes the URL context of the current attempt: the
 * stored snapshot carries the generated return URL of the first submit, and
 * only the generated checkout key query value is normalized away. Origin,
 * path and all other query parameters stay auditable, so a changed external
 * URL never replays old evidence. Storage failures stay non-fatal: a denied
 * store simply disables the retry without failing the purchase.
 */
export function ticketCheckoutRetryLoad(
  input: CheckoutLookupMaterialLike,
  urlContext?: { readonly successUrl: string; readonly cancelUrl: string },
): TicketCheckoutRetryStored | undefined {
  const loaded = ticketCheckoutRetryStorageLoad()
  if (!loaded.success) return undefined
  const urls = urlContext ?? { successUrl: input.successUrl ?? "", cancelUrl: input.cancelUrl ?? "" }
  const lookupKey = ticketCheckoutRetryLookupKey(input, urls)
  return loaded.data.find((candidate) => {
    if (candidate.eventKey !== input.eventKey) return false
    const material = materialInputOf(candidate)
    if (!material) return false
    const candidateUrls = { successUrl: material.successUrl, cancelUrl: material.cancelUrl }
    return ticketCheckoutRetryLookupKey(material, candidateUrls) === lookupKey
  })
}

/**
 * Stores the retry snapshot for a code-bound order before the first network
 * submit. Code-free orders are never stored; a denied store never fails.
 */
export function ticketCheckoutRetryStore(input: {
  readonly checkoutInput: TicketCheckoutCreateInput
  readonly checkoutKey: string
  readonly guestAccessToken?: string
}): void {
  if (!ticketCheckoutRetryHasCode(input.checkoutInput)) return
  const loaded = ticketCheckoutRetryStorageLoad()
  const stored: TicketCheckoutRetryStored = {
    eventKey: input.checkoutInput.eventKey,
    materialKey: ticketCheckoutRetryMaterialKey(input.checkoutInput),
    checkoutKey: input.checkoutKey,
    ...(input.guestAccessToken === undefined ? {} : { guestAccessToken: input.guestAccessToken }),
    checkoutInput: { ...(input.checkoutInput as unknown as Record<string, unknown>) },
    savedAt: Date.now(),
  }
  const others = loaded.success
    ? loaded.data.filter(
        (candidate) =>
          !(candidate.eventKey === stored.eventKey && candidate.materialKey === stored.materialKey) &&
          !(
            candidate.eventKey === stored.eventKey &&
            !ticketCheckoutRetryHasCode(materialInputOf(candidate) ?? { tickets: [] })
          ),
      )
    : []
  ticketCheckoutRetryStorageSave([stored, ...others])
}

/**
 * Removes the retry snapshot of one checkout key and keeps every other
 * snapshot untouched. The backend reports a checkout key as terminal when its
 * order reached a final status; such a key must never be replayed again, so
 * its record is dropped before a fresh checkout starts. Storage failures stay
 * non-fatal for the caller: a denied store simply keeps the record.
 */
export function ticketCheckoutRetryClearByCheckoutKey(checkoutKey: string): Result<null> {
  const op = "ticketCheckoutRetryClearByCheckoutKey"
  const loaded = ticketCheckoutRetryStorageLoad()
  if (!loaded.success) return createResultError(op, loaded.errorMessage, loaded)
  const remaining = loaded.data.filter((candidate) => candidate.checkoutKey !== checkoutKey)
  if (remaining.length === loaded.data.length) return createResult(null)
  return ticketCheckoutRetryStorageSave(remaining)
}
