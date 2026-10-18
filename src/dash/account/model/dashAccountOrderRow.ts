import type { dashAccountOrders } from "./dashAccountOrders.ts"

export type DashAccountOrderRow = ReturnType<typeof dashAccountOrders>[number]
