import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashAccountTab } from "./model/dashAccountTab.ts"
import type { DashAccountState } from "./model/dashAccountState.ts"

type DashAccountStateInput = {
  tab: DashAccountTab
  ticketId: string | null
  orderId: string | null
}

export function dashAccountStateCreate(initial: DashAccountStateInput): DashAccountState {
  const tab = createSignalObject<DashAccountTab>(initial.tab)
  const ticketId = createSignalObject<string | null>(initial.ticketId)
  const orderId = createSignalObject<string | null>(initial.orderId)
  const pastOpen = createSignalObject(false)
  return {
    tab: tab.get,
    setTab: tab.set,
    ticketId: ticketId.get,
    setTicketId: ticketId.set,
    orderId: orderId.get,
    setOrderId: orderId.set,
    pastOpen: pastOpen.get,
    setPastOpen: pastOpen.set,
  }
}
