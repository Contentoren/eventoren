import { getRouteApi } from "@tanstack/solid-router"
import { createEffect, createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { TicketCart } from "../ticketing/TicketCart.ts"
import type { TicketCartDraft } from "../ticketing/TicketCartDraft.ts"
import { ticketCartActivationCodeMerge } from "../ticketing/ticketCartActivationCodeMerge.ts"
import { ticketCartForEventResolve } from "../ticketing/ticketCartForEventResolve.ts"
import { ticketCartDraftAddOrUpdate } from "../ticketing/ticketCartDraftAddOrUpdate.ts"
import { ticketCartDraftEventName } from "../ticketing/ticketCartDraftEventName.ts"
import { ticketCartDraftLoad } from "../ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftSave } from "../ticketing/ticketCartDraftSave.ts"
import { ticketCartSearchFormat } from "../ticketing/ticketCartSearchFormat.ts"
import { ticketCartSearchParse } from "../ticketing/ticketCartSearchParse.ts"
import type { EventItem } from "./EventItem.ts"
import { eventTicketTierActivationCodeRequiredGet } from "./eventTicketTierActivationCodeRequiredGet.ts"

const routeApi = getRouteApi("/events/$eventId")

export function eventDetailPageStateCreate(inputs: { event: () => EventItem }) {
  const search = routeApi.useSearch()
  const params = routeApi.useParams()
  const navigate = routeApi.useNavigate()

  const event = createMemo(() => inputs.event())
  // Reactive draft mirror: localStorage reads are not reactive, and code-only
  // updates navigate to an identical quantity-only search, so the cart must
  // recompute from this signal instead of reading storage directly.
  const draft = createSignalObject<TicketCartDraft>(ticketCartDraftLoad())
  const syncDraft = () => {
    draft.set(ticketCartDraftLoad())
  }
  // Plain accessor (not createMemo): recomputes on every read, so code-only
  // updates stay visible even when the router reuses an identical search and
  // in server builds where memos evaluate only once.
  const cart = (): TicketCart => {
    const resolved = ticketCartForEventResolve(event(), ticketCartSearchParse(params().eventId, search().tickets ?? ""))
    if (!resolved) return { eventId: event().id, lines: [] }
    return ticketCartActivationCodeMerge(resolved, draft.get())
  }
  const hydrated = createSignalObject(false)

  let initializedEventId = ""

  const applyCart = (next: TicketCart, resetScroll = false) => {
    const existing = draft.get()
    const carriesCode = next.lines.some((line) => (line.activationCode ?? "").trim().length > 0)
    if (carriesCode || existing.some((entry) => entry.eventId === params().eventId)) {
      const updated = ticketCartDraftAddOrUpdate(existing, next)
      draft.set(updated)
      ticketCartDraftSave(updated)
    }
    navigate({
      to: "/events/$eventId",
      params: { eventId: params().eventId },
      search: { tickets: ticketCartSearchFormat(next) || undefined },
      replace: true,
      resetScroll,
    })
  }

  createEffect(() => {
    const currentEvent = event()
    const eventId = params().eventId
    if (initializedEventId === eventId) return
    initializedEventId = eventId

    const hasValidSelection = cart().lines.some((line) => currentEvent.tiers.some((tier) => tier.id === line.tierId))
    if (hasValidSelection) return

    // Never preselect a code-protected tier: unlocking requires an explicitly
    // validated code first. Fall back to the first available unprotected tier
    // and leave the cart empty when every tier is protected.
    const firstAvailableTier = currentEvent.tiers.find(
      (tier) => tier.available > 0 && !eventTicketTierActivationCodeRequiredGet(tier),
    )
    if (!firstAvailableTier) return

    applyCart({ eventId, lines: [{ tierId: firstAvailableTier.id, quantity: 1 }] }, true)
  })

  onMount(() => {
    hydrated.set(true)

    if (typeof window === "undefined") return

    syncDraft()
    window.addEventListener(ticketCartDraftEventName, syncDraft)
    window.addEventListener("storage", syncDraft)

    onCleanup(() => {
      window.removeEventListener(ticketCartDraftEventName, syncDraft)
      window.removeEventListener("storage", syncDraft)
    })
  })

  const goToCart = () => {
    const updated = ticketCartDraftAddOrUpdate(draft.get(), cart())
    draft.set(updated)
    ticketCartDraftSave(updated)
    navigate({
      to: "/warenkorb",
    })
  }

  const goToCheckout = () => {
    const updated = ticketCartDraftAddOrUpdate(draft.get(), cart())
    draft.set(updated)
    ticketCartDraftSave(updated)
    navigate({
      to: "/checkout",
      search: { event: params().eventId, tickets: ticketCartSearchFormat(cart()) || undefined },
    })
  }

  return { event, cart, hydrated: hydrated.get, applyCart, goToCart, goToCheckout }
}
