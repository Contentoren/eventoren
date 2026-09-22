import { createServerFn } from "@tanstack/solid-start"
import { ticketCheckoutCreateFromSession } from "#src/server/ticketCheckoutCreateFromSession.ts"
import { ticketOrderGetFromSession } from "#src/server/ticketOrderGetFromSession.ts"
import { ticketOrderListMineFromSession } from "#src/server/ticketOrderListMineFromSession.ts"
import { ticketPaymentReconcileFromSession } from "#src/server/ticketPaymentReconcileFromSession.ts"

const checkoutCreate = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof ticketCheckoutCreateFromSession>[0]) => input)
  .handler(({ data }) => ticketCheckoutCreateFromSession(data))
const orderListMine = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof ticketOrderListMineFromSession>[0]) => input)
  .handler(({ data }) => ticketOrderListMineFromSession(data))
const orderGet = createServerFn({ method: "GET" })
  .validator((input: Parameters<typeof ticketOrderGetFromSession>[0]) => input)
  .handler(({ data }) => ticketOrderGetFromSession(data))
const paymentReconcile = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof ticketPaymentReconcileFromSession>[0]) => input)
  .handler(({ data }) => ticketPaymentReconcileFromSession(data))

export function ticketingServerCreate() {
  return { checkoutCreate, orderListMine, orderGet, paymentReconcile }
}
