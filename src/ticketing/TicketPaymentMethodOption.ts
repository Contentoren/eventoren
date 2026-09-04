import type { TicketPaymentMethod } from "./TicketPaymentMethod.ts"

export type TicketPaymentMethodOption = {
  id: TicketPaymentMethod
  name: string
  description: string
  hint: string
}
