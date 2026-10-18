import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { EventItem } from "#src/events/EventItem.ts"
import type { TicketCart } from "#src/ticketing/TicketCart.ts"
import type { DashEvent } from "#src/dash/model/dashEventSchema.ts"
import type { DashOrg } from "#src/dash/model/dashOrgSchema.ts"
import { dashCodeValidate } from "#src/dash/model/dashCodeValidate.ts"
import { dashStateGet } from "#src/dash/store/dashStateGet.ts"
import { dashNow } from "#src/dash/store/dashNow.ts"
import { dashEventToEventItem } from "./dashEventToEventItem.ts"

export interface DashEventPreviewInputs {
  orgSlug: () => string
  eventSlug: () => string
}

/** Zustand der öffentlichen Event-Vorschau aus Dashboard-Daten: Adapter, Warenkorb, Zugangscode. */
export function dashEventPreviewStateCreate(inputs: DashEventPreviewInputs) {
  const unlockedIds = createSignalObject<readonly string[]>([])
  const codeInput = createSignalObject("")
  const codeError = createSignalObject<string | null>(null)
  const discountHint = createSignalObject<string | null>(null)
  const cartLines = createSignalObject<TicketCart["lines"]>([])

  const org = (): DashOrg | null => {
    const state = dashStateGet()
    return state.orgs.find((candidate) => candidate.slug === inputs.orgSlug()) ?? null
  }

  const event = (): DashEvent | null => {
    const state = dashStateGet()
    const current = org()
    if (!current) return null
    return (
      state.events.find((candidate) => candidate.orgId === current.id && candidate.slug === inputs.eventSlug()) ?? null
    )
  }

  const item: () => EventItem | null = createMemo(() => {
    const current = event()
    if (!current) return null
    return dashEventToEventItem(dashStateGet(), current, dashNow()(), unlockedIds.get())
  })

  const isDraft = () => event()?.status === "entwurf" || event()?.visibility === "nicht-gelistet"

  const cart = (): TicketCart => ({ eventId: item()?.id ?? "", lines: cartLines.get() })

  const applyCart = (next: TicketCart) => {
    cartLines.set(next.lines)
  }

  const previewToast = () => {
    toastAdd({ title: "Vorschau – Kauf in der Demo nicht möglich" })
  }

  const redeemCode = () => {
    const current = event()
    if (!current) return
    codeError.set(null)
    const result = dashCodeValidate({
      input: codeInput.get(),
      codes: dashStateGet().codes,
      eventId: current.id,
      now: dashNow()(),
    })
    if (!result.success) {
      codeError.set(result.errorMessage)
      return
    }
    const code = result.data
    if (code.kind === "zugang") {
      const next = [...unlockedIds.get()]
      for (const id of code.ticketTypeIds) {
        if (!next.includes(id)) next.push(id)
      }
      unlockedIds.set(next)
      discountHint.set(null)
      codeError.set(null)
      return
    }
    const label =
      code.discount?.type === "prozent"
        ? `${Math.round(code.discount.value / 100)} % Rabatt wird an der Kasse abgezogen`
        : code.discount
          ? `${(code.discount.value / 100).toLocaleString("de-DE", { minimumFractionDigits: 2 })} € Rabatt wird an der Kasse abgezogen`
          : "Rabatt wird an der Kasse abgezogen"
    discountHint.set(`Code ${code.code} · ${label}`)
    codeError.set(null)
  }

  return {
    org,
    event,
    item,
    isDraft,
    cart,
    applyCart,
    goToCart: previewToast,
    goToCheckout: previewToast,
    codeInput,
    codeError,
    discountHint,
    redeemCode,
  }
}

export type DashEventPreviewState = ReturnType<typeof dashEventPreviewStateCreate>
