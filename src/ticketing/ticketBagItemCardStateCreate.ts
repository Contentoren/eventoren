import { createEffect, onCleanup, untrack } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { Result } from "../ui/Result.ts"
import type { TicketActivationCodeGateStatus } from "./TicketActivationCodeGateStatus.ts"
import type { TicketBagItem } from "./TicketBagItem.ts"
import { ticketActivationCodeComplete } from "./ticketActivationCodeComplete.ts"
import { ticketActivationCodeFieldText } from "./ticketActivationCodeFieldText.ts"
import { ticketActivationCodeNormalize } from "./ticketActivationCodeNormalize.ts"
import { ticketActivationCodeValidate } from "./ticketActivationCodeValidate.ts"

type TicketBagItemCardValidateFn = (input: {
  readonly eventKey: string
  readonly tierKey: string
  readonly code: string
}) => Promise<Result<{ readonly valid: boolean }>>

/**
 * Read-only gate for the stored bag code. Validates the draft code already
 * attached to the line; code entry stays on the event page. Decreases and
 * removal stay allowed while locked; increases need a valid code.
 */
export function ticketBagItemCardStateCreate(inputs: {
  eventId: () => string
  item: () => TicketBagItem
  validate?: TicketBagItemCardValidateFn
}) {
  const validate: TicketBagItemCardValidateFn = inputs.validate ?? ticketActivationCodeValidate
  const fieldText = ticketActivationCodeFieldText()
  const status = createSignalObject<TicketActivationCodeGateStatus>("idle")
  const acceptedCode = createSignalObject("")
  const acceptedEvent = createSignalObject("")
  let sequence = 0
  let identity = ""
  let disposed = false

  const storedCodeGet = () => {
    const raw = inputs.item().activationCode ?? ""
    return raw.length === 0 ? "" : ticketActivationCodeNormalize(raw)
  }

  const requiredGet = () => inputs.item().activationCodeRequired === true

  const identityGet = () =>
    `${inputs.eventId()}\0${inputs.item().tierId}\0${requiredGet() ? "1" : "0"}\0${storedCodeGet()}`

  const settle = (requestIdentity: string, requestSequence: number, ok: boolean) => {
    if (disposed) return
    if (requestSequence !== sequence) return
    if (identity !== requestIdentity) return
    const currentIdentity = identityGet()
    if (currentIdentity !== requestIdentity) return
    if (!requiredGet()) return
    if (ok) {
      acceptedCode.set(storedCodeGet())
      acceptedEvent.set(inputs.eventId())
      status.set("valid")
      return
    }
    acceptedCode.set("")
    acceptedEvent.set("")
    status.set("invalid")
  }

  const sync = () => {
    if (disposed) return
    const nextIdentity = identityGet()
    if (nextIdentity === identity) return
    identity = nextIdentity
    sequence += 1
    acceptedCode.set("")
    acceptedEvent.set("")
    if (!requiredGet()) {
      status.set("idle")
      return
    }
    const code = storedCodeGet()
    if (!ticketActivationCodeComplete(code)) {
      status.set("idle")
      return
    }
    const requestIdentity = nextIdentity
    const requestSequence = sequence
    const eventId = inputs.eventId()
    const tierId = inputs.item().tierId
    status.set("checking")
    void validate({ eventKey: eventId, tierKey: tierId, code }).then(
      (result) => {
        settle(requestIdentity, requestSequence, result.success && result.data.valid)
      },
      () => {
        settle(requestIdentity, requestSequence, false)
      },
    )
  }

  sync()
  createEffect(() => {
    inputs.eventId()
    inputs.item()
    untrack(sync)
  })
  onCleanup(() => {
    disposed = true
    sequence += 1
  })

  const gateOpen = () => {
    sync()
    if (!requiredGet()) return true
    const code = storedCodeGet()
    if (!ticketActivationCodeComplete(code)) return false
    return status.get() === "valid" && acceptedCode.get() === code && acceptedEvent.get() === inputs.eventId()
  }

  const quantityAllowed = (nextQuantity: number) => {
    const current = inputs.item().quantity
    if (nextQuantity <= current) return true
    if (nextQuantity > inputs.item().maxQuantity) return false
    return gateOpen()
  }

  const visibleMaxQuantity = () => {
    sync()
    const item = inputs.item()
    if (!requiredGet() || gateOpen()) return Math.max(1, item.maxQuantity)
    return Math.max(1, item.quantity)
  }

  const optionDisabled = (quantity: number) => {
    const item = inputs.item()
    if (quantity <= item.quantity) return false
    if (quantity > item.maxQuantity) return true
    return !gateOpen()
  }

  const message = () => {
    if (!requiredGet()) return ""
    const code = storedCodeGet()
    const current = status.get()
    if (current === "checking") return fieldText.checking
    if (current === "valid") return fieldText.valid
    if (current === "invalid") return fieldText.invalid
    return code.length === 0 ? fieldText.requiredHint : fieldText.incompleteHint
  }

  return {
    status: status.get,
    gateOpen,
    quantityAllowed,
    visibleMaxQuantity,
    optionDisabled,
    message,
  }
}
