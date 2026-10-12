import { createEffect, on, onCleanup, untrack } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketActivationCodeGateStatus } from "./TicketActivationCodeGateStatus.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketActivationCodeComplete } from "./ticketActivationCodeComplete.ts"
import { ticketActivationCodeFieldText } from "./ticketActivationCodeFieldText.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"
import { ticketActivationCodeValidate } from "./ticketActivationCodeValidate.ts"
import { ticketCartQuantityOf } from "./ticketCartQuantityOf.ts"
import { ticketCartQuantitySet } from "./ticketCartQuantitySet.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

type TicketActivationCodeValidateFn = (input: {
  readonly eventKey: string
  readonly tierKey: string
  readonly code: string
}) => Promise<Result<{ readonly valid: boolean }>>

export function ticketTierSelectorStateCreate(inputs: {
  event: () => EventItem
  cart: () => TicketCart
  onCartChange: (cart: TicketCart) => void
  validate?: TicketActivationCodeValidateFn
}) {
  const validate: TicketActivationCodeValidateFn = inputs.validate ?? ticketActivationCodeValidate
  const fieldText = ticketActivationCodeFieldText()
  // Plain accessors (not createMemo): they recompute on every read, so signal
  // updates stay visible both in the browser and in the server build used by
  // bun tests, where createMemo evaluates only once.
  const total = () => ticketCartTotalCalculate(inputs.cart(), inputs.event())

  const codeValues = createSignalObject<Record<string, string>>({})
  const codeStatuses = createSignalObject<Record<string, TicketActivationCodeGateStatus>>({})
  const validatedCodes = createSignalObject<Record<string, string>>({})
  const requestSeq: Record<string, number> = {}
  // Last cart code observed per tier (complete code or ""). Updated synchronously
  // with every own cart write, so the reactive cart sync can tell self-triggered
  // updates (ignore) apart from external ones (adopt/invalidate).
  const lastExternalCode: Record<string, string> = {}
  // Event id the accepted code was validated for. Checked synchronously so a
  // stale valid status can never unlock a new event context before effects run.
  const validatedEvent: Record<string, string> = {}
  const lastRequired: Record<string, boolean> = {}
  let lastEventId: string | undefined
  let disposed = false

  type SelectorRow = {
    readonly id: string
    readonly name: string
    readonly description: string
    readonly priceLabel: string
    readonly totalLabel: string
    readonly soldOut: boolean
    readonly quantity: number
    readonly maxQuantity: number
    readonly canDecrease: boolean
    readonly canIncrease: boolean
    readonly activationCodeRequired: boolean
    readonly activationCodeValue: string
    readonly activationCodeStatus: TicketActivationCodeGateStatus
    readonly activationCodeMessage: string
    readonly activationCodeFieldId: string
  }

  const rowCache = new Map<string, SelectorRow>()
  let cachedEventId: string | undefined

  const tierById = (tierId: string) => inputs.event().tiers.find((candidate) => candidate.id === tierId)

  const quantityGet = (tierId: string) => ticketCartQuantityOf(inputs.cart(), tierId)

  const maxQuantityGet = (tierId: string) => {
    const tier = tierById(tierId)
    if (!tier) return 0
    return Math.max(0, Math.min(tier.available, eventTicketTierMaxPerOrderGet(tier)))
  }

  const codeValueGet = (tierId: string) => codeValues.get()[tierId] ?? ""

  const codeStatusGet = (tierId: string): TicketActivationCodeGateStatus => codeStatuses.get()[tierId] ?? "idle"

  const gateOpenGet = (tierId: string) => {
    const tier = tierById(tierId)
    if (!tier || tier.activationCodeRequired !== true) return true
    return (
      codeStatusGet(tierId) === "valid" &&
      codeValueGet(tierId) === (validatedCodes.get()[tierId] ?? "") &&
      (validatedEvent[tierId] ?? "") === inputs.event().id
    )
  }

  const codeMessageGet = (tierId: string) => {
    const tier = tierById(tierId)
    if (!tier || tier.activationCodeRequired !== true) return ""
    const status = codeStatusGet(tierId)
    const value = codeValueGet(tierId)
    if (status === "checking") return fieldText.checking
    if (status === "valid") return fieldText.valid
    if (status === "invalid") return fieldText.invalid
    return value.length === 0 ? fieldText.requiredHint : fieldText.incompleteHint
  }

  const rowCreate = (tierId: string): SelectorRow =>
    ({
      id: tierId,
      get name() {
        return tierById(tierId)?.name ?? ""
      },
      get description() {
        return tierById(tierId)?.description ?? ""
      },
      get priceLabel() {
        const tier = tierById(tierId)
        return tier ? ticketPriceFormat(tier.priceCents) : ""
      },
      get totalLabel() {
        const tier = tierById(tierId)
        return tier ? `${ticketPriceFormat(tier.priceCents + tier.feeCents)} pro Ticket inkl. Gebühren` : ""
      },
      get soldOut() {
        return (tierById(tierId)?.available ?? 0) === 0
      },
      get quantity() {
        return quantityGet(tierId)
      },
      get maxQuantity() {
        return maxQuantityGet(tierId)
      },
      get canDecrease() {
        return quantityGet(tierId) > 0
      },
      get canIncrease() {
        return quantityGet(tierId) < maxQuantityGet(tierId) && gateOpenGet(tierId)
      },
      get activationCodeRequired() {
        return tierById(tierId)?.activationCodeRequired === true
      },
      get activationCodeValue() {
        return codeValueGet(tierId)
      },
      get activationCodeStatus() {
        return codeStatusGet(tierId)
      },
      get activationCodeMessage() {
        return codeMessageGet(tierId)
      },
      activationCodeFieldId: `ticket-activation-code-${tierId}`,
    }) as SelectorRow

  const cartWithoutTierCode = (cart: TicketCart, tierId: string): TicketCart => ({
    ...cart,
    lines: cart.lines.map((line) => (line.tierId === tierId ? { tierId: line.tierId, quantity: line.quantity } : line)),
  })

  const cartCodeGet = (cart: TicketCart, tierId: string): string => {
    const line = cart.lines.find((candidate) => candidate.tierId === tierId)
    if (!line?.activationCode) return ""
    const normalized = ticketActivationCodeNormalize(line.activationCode)
    return ticketActivationCodeComplete(normalized) ? normalized : ""
  }

  const requestValidation = (tierId: string, code: string) => {
    const event = inputs.event()
    const tier = event.tiers.find((candidate) => candidate.id === tierId)
    if (!tier || tier.activationCodeRequired !== true || disposed) return
    const eventId = event.id
    const sequence = (requestSeq[tierId] ?? 0) + 1
    requestSeq[tierId] = sequence
    codeStatuses.set({ ...codeStatuses.get(), [tierId]: "checking" })
    void validate({ eventKey: eventId, tierKey: tierId, code }).then(
      (result) => {
        validationSettle(tierId, code, eventId, sequence, result.success && result.data.valid)
      },
      () => {
        validationSettle(tierId, code, eventId, sequence, false)
      },
    )
  }

  const validationSettle = (tierId: string, code: string, eventId: string, sequence: number, ok: boolean) => {
    if (disposed) return
    if ((requestSeq[tierId] ?? 0) !== sequence) return
    if (inputs.event().id !== eventId) return
    const tier = tierById(tierId)
    if (!tier || tier.activationCodeRequired !== true) return
    if ((codeValues.get()[tierId] ?? "") !== code) return
    if (ok) {
      validatedCodes.set({ ...validatedCodes.get(), [tierId]: code })
      validatedEvent[tierId] = eventId
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "valid" })
      const cart = inputs.cart()
      const line = cart.lines.find((candidate) => candidate.tierId === tierId)
      if (!line || line.quantity <= 0) {
        lastExternalCode[tierId] = cartCodeGet(cart, tierId)
        return
      }
      const observed = ticketActivationCodeNormalize(line.activationCode ?? "")
      if (observed === code) {
        lastExternalCode[tierId] = code
        return
      }
      if (observed.length > 0) {
        // An external code won the race while this response was pending.
        // Never overwrite it; adopt it instead.
        syncTierFromCart(tierId, cart)
        return
      }
      lastExternalCode[tierId] = code
      inputs.onCartChange({
        ...cart,
        lines: cart.lines.map((candidate) =>
          candidate.tierId === tierId
            ? { tierId: candidate.tierId, quantity: candidate.quantity, activationCode: code }
            : candidate,
        ),
      })
      return
    }
    const nextValidated = { ...validatedCodes.get() }
    delete nextValidated[tierId]
    validatedCodes.set(nextValidated)
    delete validatedEvent[tierId]
    codeStatuses.set({ ...codeStatuses.get(), [tierId]: "invalid" })
    const cart = inputs.cart()
    const line = cart.lines.find((candidate) => candidate.tierId === tierId)
    const observed = line?.activationCode ? ticketActivationCodeNormalize(line.activationCode) : ""
    if (line && observed === code) {
      // Strip only the exact code that just failed validation.
      lastExternalCode[tierId] = ""
      inputs.onCartChange(cartWithoutTierCode(cart, tierId))
      return
    }
    syncTierFromCart(tierId, cart)
  }

  // Reactive EXTERNAL cart code synchronization. No-ops for self-triggered
  // updates (lastExternalCode already matches) and for tiers without a line,
  // so typing before the first quantity increment is never erased.
  const syncTierFromCart = (tierId: string, cart: TicketCart) => {
    const tier = tierById(tierId)
    if (!tier || tier.activationCodeRequired !== true) return
    const observed = cartCodeGet(cart, tierId)
    const last = lastExternalCode[tierId] ?? ""
    if (observed === last) return
    if (observed.length === 0) {
      lastExternalCode[tierId] = ""
      const nextValidated = { ...validatedCodes.get() }
      delete nextValidated[tierId]
      validatedCodes.set(nextValidated)
      delete validatedEvent[tierId]
      const currentValue = codeValues.get()[tierId] ?? ""
      if (currentValue !== last) {
        // Own in-progress typed replacement: keep the text and its pending
        // validation, only drop the accepted state.
        return
      }
      // The input still shows the removed code: invalidate fully.
      requestSeq[tierId] = (requestSeq[tierId] ?? 0) + 1
      if (currentValue.length > 0) codeValues.set({ ...codeValues.get(), [tierId]: "" })
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "idle" })
      return
    }
    // Incoming restored/new cart code: seed it and validate before unlock.
    // External input wins over in-progress typing.
    lastExternalCode[tierId] = observed
    const nextValidated = { ...validatedCodes.get() }
    delete nextValidated[tierId]
    validatedCodes.set(nextValidated)
    delete validatedEvent[tierId]
    codeValues.set({ ...codeValues.get(), [tierId]: observed })
    requestValidation(tierId, observed)
  }

  const resetTierState = (tierId: string) => {
    requestSeq[tierId] = (requestSeq[tierId] ?? 0) + 1
    const values = { ...codeValues.get() }
    delete values[tierId]
    codeValues.set(values)
    const statuses = { ...codeStatuses.get() }
    delete statuses[tierId]
    codeStatuses.set(statuses)
    const validated = { ...validatedCodes.get() }
    delete validated[tierId]
    validatedCodes.set(validated)
    delete validatedEvent[tierId]
    delete lastExternalCode[tierId]
  }

  const lastRequiredClear = () => {
    for (const tierId of Object.keys(lastRequired)) delete lastRequired[tierId]
  }

  const syncContextFromEvent = (event: EventItem) => {
    if (lastEventId !== event.id) {
      const ids = new Set<string>([...Object.keys(lastRequired), ...event.tiers.map((tier) => tier.id)])
      for (const tierId of ids) resetTierState(tierId)
      lastEventId = event.id
      lastRequiredClear()
      for (const tier of event.tiers) lastRequired[tier.id] = tier.activationCodeRequired === true
      const cart = inputs.cart()
      for (const tier of event.tiers) {
        if (tier.activationCodeRequired === true) syncTierFromCart(tier.id, cart)
      }
      return
    }
    const currentIds = new Set(event.tiers.map((tier) => tier.id))
    for (const tierId of Object.keys(lastRequired)) {
      if (!currentIds.has(tierId)) {
        resetTierState(tierId)
        delete lastRequired[tierId]
      }
    }
    for (const tier of event.tiers) {
      const required = tier.activationCodeRequired === true
      if (!(tier.id in lastRequired)) {
        lastRequired[tier.id] = required
        if (required) syncTierFromCart(tier.id, inputs.cart())
      } else if (lastRequired[tier.id] !== required) {
        lastRequired[tier.id] = required
        resetTierState(tier.id)
        if (required) syncTierFromCart(tier.id, inputs.cart())
      }
    }
  }

  const activationCodeChange = (tierId: string, raw: string) => {
    const tier = inputs.event().tiers.find((candidate) => candidate.id === tierId)
    if (!tier || tier.activationCodeRequired !== true) return
    syncTierFromCart(tierId, inputs.cart())
    const normalized = raw
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 8)
    const previous = codeValues.get()[tierId] ?? ""
    if (normalized === previous) {
      if (normalized.length === 8 && (codeStatuses.get()[tierId] ?? "idle") === "idle") {
        requestValidation(tierId, normalized)
      }
      return
    }
    codeValues.set({ ...codeValues.get(), [tierId]: normalized })
    if (
      normalized.length > 0 &&
      normalized === (validatedCodes.get()[tierId] ?? "") &&
      (codeStatuses.get()[tierId] ?? "idle") === "valid"
    )
      return
    requestSeq[tierId] = (requestSeq[tierId] ?? 0) + 1
    const nextValidated = { ...validatedCodes.get() }
    delete nextValidated[tierId]
    validatedCodes.set(nextValidated)
    delete validatedEvent[tierId]
    const cart = inputs.cart()
    const line = cart.lines.find((candidate) => candidate.tierId === tierId)
    if (line?.activationCode) {
      lastExternalCode[tierId] = ""
      inputs.onCartChange(cartWithoutTierCode(cart, tierId))
    }
    if (normalized.length === 8 && ticketActivationCodeComplete(normalized)) {
      requestValidation(tierId, normalized)
    } else {
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "idle" })
    }
  }

  const activationCodeValidate = (tierId: string) => {
    const tier = inputs.event().tiers.find((candidate) => candidate.id === tierId)
    if (!tier || tier.activationCodeRequired !== true) return
    syncTierFromCart(tierId, inputs.cart())
    const value = codeValues.get()[tierId] ?? ""
    if (value === (validatedCodes.get()[tierId] ?? "") && codeStatuses.get()[tierId] === "valid") return
    if (!ticketActivationCodeComplete(value)) {
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "idle" })
      return
    }
    requestValidation(tierId, value)
  }

  // Initial sync runs synchronously so restored codes seed before unlock in
  // every runtime; the effects below keep external/context changes reactive
  // in the real Solid client (bun --conditions=browser) via untracked syncs.
  syncContextFromEvent(inputs.event())
  createEffect(
    on(
      () => inputs.event(),
      (event) => {
        syncContextFromEvent(event)
      },
    ),
  )
  createEffect(
    on(
      () => inputs.cart(),
      (cart) => {
        const event = untrack(() => inputs.event())
        for (const tier of event.tiers) {
          if (tier.activationCodeRequired === true) syncTierFromCart(tier.id, cart)
        }
      },
    ),
  )
  onCleanup(() => {
    disposed = true
    for (const tierId of Object.keys(requestSeq)) requestSeq[tierId] = (requestSeq[tierId] ?? 0) + 1
  })

  const rows = (): SelectorRow[] => {
    const event = inputs.event()
    if (cachedEventId !== event.id) {
      rowCache.clear()
      cachedEventId = event.id
    }
    const currentIds = new Set(event.tiers.map((tier) => tier.id))
    for (const cachedId of [...rowCache.keys()]) {
      if (!currentIds.has(cachedId)) rowCache.delete(cachedId)
    }
    return event.tiers.map((tier) => {
      const cached = rowCache.get(tier.id)
      if (cached) return cached
      const created = rowCreate(tier.id)
      rowCache.set(tier.id, created)
      return created
    })
  }

  const quantityChange = (tierId: string, delta: number) => {
    const row = rows().find((candidate) => candidate.id === tierId)
    if (!row) return
    // Reconcile external cart codes synchronously so the checks below stay
    // authoritative even before reactive effects run.
    syncTierFromCart(tierId, inputs.cart())
    if (delta > 0 && row.activationCodeRequired && row.activationCodeStatus !== "valid") return
    const next = Math.max(0, Math.min(row.maxQuantity, row.quantity + delta))
    if (next === row.quantity) return
    const updated = ticketCartQuantitySet(inputs.cart(), tierId, next)
    if (next === 0 || !row.activationCodeRequired) {
      if (row.activationCodeRequired) lastExternalCode[tierId] = ""
      inputs.onCartChange(updated)
      return
    }
    const accepted = validatedCodes.get()[tierId] ?? ""
    const currentValue = codeValues.get()[tierId] ?? ""
    const status = codeStatuses.get()[tierId] ?? "idle"
    const requiredStill = tierById(tierId)?.activationCodeRequired === true
    const eventMatches = (validatedEvent[tierId] ?? "") === inputs.event().id
    if (status === "valid" && accepted.length > 0 && currentValue === accepted && requiredStill && eventMatches) {
      lastExternalCode[tierId] = accepted
      inputs.onCartChange({
        ...updated,
        lines: updated.lines.map((line) => (line.tierId === tierId ? { ...line, activationCode: accepted } : line)),
      })
      return
    }
    lastExternalCode[tierId] = ""
    inputs.onCartChange({
      ...updated,
      lines: updated.lines.map((line) =>
        line.tierId === tierId ? { tierId: line.tierId, quantity: line.quantity } : line,
      ),
    })
  }

  const increaseTier = (tierId: string) => quantityChange(tierId, 1)
  const decreaseTier = (tierId: string) => quantityChange(tierId, -1)

  const hintLabel = () => {
    const limits = inputs.event().tiers.map((tier) => eventTicketTierMaxPerOrderGet(tier))
    const distinct = [...new Set(limits)]
    const perProduct =
      distinct.length === 1
        ? `Maximal ${distinct[0]} Tickets je Produkt pro Bestellung.`
        : "Je Produkt gilt das jeweilige Bestelllimit."
    const capped = total().quantity > 0 && rows().every((row) => row.quantity >= row.maxQuantity || row.soldOut)
    const codeNotice = inputs.event().tiers.some((tier) => tier.activationCodeRequired === true)
      ? " Für codepflichtige Produkte ist erst nach geprüftem Freischaltungscode eine Auswahl möglich."
      : ""
    return `${capped ? `${perProduct} Limit erreicht.` : perProduct}${codeNotice}`
  }

  const selectionLabel = () =>
    total().quantity === 0 ? "Keine Tickets ausgewählt" : `${total().quantity} Tickets ausgewählt`

  return {
    rows,
    total,
    increaseTier,
    decreaseTier,
    hintLabel,
    selectionLabel,
    activationCodeChange,
    activationCodeValidate,
  }
}
