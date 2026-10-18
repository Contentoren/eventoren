import type { DashAccountTab } from "./dashAccountTab.ts"

export type DashAccountState = {
  tab: () => DashAccountTab
  setTab: (value: DashAccountTab) => void
  ticketId: () => string | null
  setTicketId: (value: string | null) => void
  orderId: () => string | null
  setOrderId: (value: string | null) => void
  pastOpen: () => boolean
  setPastOpen: (value: boolean) => void
}
