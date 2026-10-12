import { createEffect, on } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { EventItem } from "../events/EventItem.ts"
import { eventTicketTierMaxPerOrderGet } from "../events/eventTicketTierMaxPerOrderGet.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketCart } from "./TicketCart.ts"
import { ticketActivationCodeComplete } from "./ticketActivationCodeComplete.ts"
import { ticketActivationCodeFieldText } from "./ticketActivationCodeFieldText.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"
import { ticketActivationCodeValidate } from "./ticketActivationCodeValidate.ts"
import { ticketCartQuantityOf } from "./ticketCartQuantityOf.ts"
import { ticketCartQuantitySet } from "./ticketCartQuantitySet.ts"
import { ticketCartTotalCalculate } from "./ticketCartTotalCalculate.ts"
import { ticketPriceFormat } from "./ticketPriceFormat.ts"

export type TicketActivationCodeStatus = "idle" | "checking" | "valid" | "invalid"

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
  const codeStatuses = createSignalObject<Record<string, TicketActivationCodeStatus>>({})
  const validatedCodes = createSignalObject<Record<string, string>>({})
  const requestSeq: Record<string, number> = {}

  const cartWithoutTierCode = (cart: TicketCart, tierId: string): TicketCart => ({
    ...cart,
    lines: cart.lines.map((line) => (line.tierId === tierId ? { tierId: line.tierId, quantity: line.quantity } : line)),
  })

  const requestValidation = (tierId: string, code: string) => {
    const sequence = (requestSeq[tierId] ?? 0) + 1
    requestSeq[tierId] = sequence
    codeStatuses.set({ ...codeStatuses.get(), [tierId]: "checking" })
    void validate({ eventKey: inputs.event().id, tierKey: tierId, code }).then((result) => {
      if (requestSeq[tierId] !== sequence) return
      if ((codeValues.get()[tierId] ?? "") !== code) return
      if (result.success && result.data.valid) {
        validatedCodes.set({ ...validatedCodes.get(), [tierId]: code })
        codeStatuses.set({ ...codeStatuses.get(), [tierId]: "valid" })
        const cart = inputs.cart()
        const line = cart.lines.find((candidate) => candidate.tierId === tierId)
        if (line && line.quantity > 0 && line.activationCode !== code) {
          inputs.onCartChange({
            ...cart,
            lines: cart.lines.map((candidate) =>
              candidate.tierId === tierId
                ? { tierId: candidate.tierId, quantity: candidate.quantity, activationCode: code }
                : candidate,
            ),
          })
        }
        return
      }
      const nextValidated = { ...validatedCodes.get() }
      delete nextValidated[tierId]
      validatedCodes.set(nextValidated)
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "invalid" })
      const cart = inputs.cart()
      const line = cart.lines.find((candidate) => candidate.tierId === tierId)
      if (line?.activationCode) inputs.onCartChange(cartWithoutTierCode(cart, tierId))
    })
  }

  const activationCodeChange = (tierId: string, raw: string) => {
    const tier = inputs.event().tiers.find((candidate) => candidate.id === tierId)
    if (!tier || tier.activationCodeRequired !== true) return
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
    if (normalized === (validatedCodes.get()[tierId] ?? "")) return
    requestSeq[tierId] = (requestSeq[tierId] ?? 0) + 1
    const nextValidated = { ...validatedCodes.get() }
    delete nextValidated[tierId]
    validatedCodes.set(nextValidated)
    const cart = inputs.cart()
    const line = cart.lines.find((candidate) => candidate.tierId === tierId)
    if (line?.activationCode) inputs.onCartChange(cartWithoutTierCode(cart, tierId))
    if (normalized.length === 8 && ticketActivationCodeComplete(normalized)) {
      requestValidation(tierId, normalized)
    } else {
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "idle" })
    }
  }

  const activationCodeValidate = (tierId: string) => {
    const tier = inputs.event().tiers.find((candidate) => candidate.id === tierId)
    if (!tier || tier.activationCodeRequired !== true) return
    const value = codeValues.get()[tierId] ?? ""
    if (value === (validatedCodes.get()[tierId] ?? "") && codeStatuses.get()[tierId] === "valid") return
    if (!ticketActivationCodeComplete(value)) {
      codeStatuses.set({ ...codeStatuses.get(), [tierId]: "idle" })
      return
    }
    requestValidation(tierId, value)
  }

  const seedFromCart = (cart: TicketCart) => {
    let nextValues: Record<string, string> | undefined
    const pending: string[] = []
    for (const line of cart.lines) {
      if (!line.activationCode) continue
      const tier = inputs.event().tiers.find((candidate) => candidate.id === line.tierId)
      if (!tier || tier.activationCodeRequired !== true) continue
      const normalized = ticketActivationCodeNormalize(line.activationCode)
      if (!ticketActivationCodeComplete(normalized)) continue
      if ((codeValues.get()[line.tierId] ?? "").length > 0) continue
      nextValues = { ...(nextValues ?? codeValues.get()), [line.tierId]: normalized }
      pending.push(line.tierId)
    }
    if (nextValues) codeValues.set(nextValues)
    for (const tierId of pending) {
      if ((codeStatuses.get()[tierId] ?? "idle") !== "idle") continue
      const value = codeValues.get()[tierId] ?? ""
      if (value.length === 8) requestValidation(tierId, value)
    }
  }

  seedFromCart(inputs.cart())
  createEffect(
    on(
      () => inputs.cart(),
      (cart) => {
        seedFromCart(cart)
      },
    ),
  )

  const rows = () =>
    inputs.event().tiers.map((tier) => {
      const quantity = ticketCartQuantityOf(inputs.cart(), tier.id)
      const maxQuantity = Math.max(0, Math.min(tier.available, eventTicketTierMaxPerOrderGet(tier)))
      const codeRequired = tier.activationCodeRequired === true
      const codeValue = codeValues.get()[tier.id] ?? ""
      const codeStatus = codeStatuses.get()[tier.id] ?? "idle"
      const gateOpen = !codeRequired || (codeStatus === "valid" && codeValue === (validatedCodes.get()[tier.id] ?? ""))
      const codeMessage = !codeRequired
        ? ""
        : codeStatus === "checking"
          ? fieldText.checking
          : codeStatus === "valid"
            ? fieldText.valid
            : codeStatus === "invalid"
              ? fieldText.invalid
              : codeValue.length === 0
                ? fieldText.requiredHint
                : fieldText.incompleteHint
      return {
        id: tier.id,
        name: tier.name,
        description: tier.description,
        priceLabel: ticketPriceFormat(tier.priceCents),
        totalLabel: `${ticketPriceFormat(tier.priceCents + tier.feeCents)} pro Ticket inkl. Gebühren`,
        soldOut: tier.available === 0,
        quantity,
        maxQuantity,
        canDecrease: quantity > 0,
        canIncrease: quantity < maxQuantity && gateOpen,
        activationCodeRequired: codeRequired,
        activationCodeValue: codeValue,
        activationCodeStatus: codeStatus as TicketActivationCodeStatus,
        activationCodeMessage: codeMessage,
        activationCodeFieldId: `ticket-activation-code-${tier.id}`,
      }
    })

  const quantityChange = (tierId: string, delta: number) => {
    const row = rows().find((candidate) => candidate.id === tierId)
    if (!row) return
    if (delta > 0 && row.activationCodeRequired && row.activationCodeStatus !== "valid") return
    const next = Math.max(0, Math.min(row.maxQuantity, row.quantity + delta))
    if (next === row.quantity) return
    const updated = ticketCartQuantitySet(inputs.cart(), tierId, next)
    if (next === 0 || !row.activationCodeRequired) {
      inputs.onCartChange(updated)
      return
    }
    const validated = validatedCodes.get()[tierId] ?? row.activationCodeValue
    inputs.onCartChange({
      ...updated,
      lines: updated.lines.map((line) => (line.tierId === tierId ? { ...line, activationCode: validated } : line)),
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
