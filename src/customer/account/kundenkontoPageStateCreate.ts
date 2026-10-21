import { createMemo } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Id } from "#convex/_generated/dataModel.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { kundenkontoMutationsCreate } from "./kundenkontoMutationsCreate.ts"
import type { KundenkontoSearch } from "./kundenkontoSearchParse.ts"

/** Customer account state: own tickets, orders with invoice, profile. No org scope. */
export function kundenkontoPageStateCreate(inputs: {
  search: () => KundenkontoSearch
  changeSearch: (search: KundenkontoSearch) => void
}) {
  const tab = () => inputs.search().tab ?? "tickets"
  const mutations = kundenkontoMutationsCreate()

  const tickets = queryCreate(api.customerAccount.customerAccountTicketListQuery, () =>
    tab() === "tickets" ? { paginationOpts: { numItems: 25, cursor: inputs.search().cursor ?? null } } : undefined,
  )
  const orders = queryCreate(api.customerAccount.customerAccountOrderListQuery, () =>
    tab() === "bestellungen" ? { paginationOpts: { numItems: 25, cursor: inputs.search().cursor ?? null } } : undefined,
  )
  const detail = queryCreate(api.customerAccount.customerAccountOrderGetQuery, () => {
    const orderId = inputs.search().bestellung
    if (tab() !== "bestellungen" || !orderId) return undefined
    return { orderId: orderId as Id<"ticketOrders"> }
  })
  const profile = queryCreate(api.customerAccount.customerAccountProfileGetQuery, () =>
    tab() === "profil" ? {} : undefined,
  )

  const name = createSignalObject("")
  const busy = createSignalObject(false)
  const message = createSignalObject("")

  return {
    tab,
    tickets: createMemo(() => {
      const current = tickets()
      return current?.success ? current.data.page : []
    }),
    orders: createMemo(() => {
      const current = orders()
      return current?.success ? current.data.page : []
    }),
    detail: createMemo(() => {
      const current = detail()
      return current?.success ? current.data : undefined
    }),
    profile: createMemo(() => {
      const current = profile()
      return current?.success ? current.data : undefined
    }),
    name,
    busy: busy.get,
    message: message.get,
    selectTab: (next: "tickets" | "bestellungen" | "profil") => {
      message.set("")
      inputs.changeSearch({ tab: next })
    },
    openOrder: (orderId: string) => inputs.changeSearch({ tab: "bestellungen", bestellung: orderId }),
    saveProfile: async (event: SubmitEvent) => {
      event.preventDefault()
      if (busy.get() || !name.get().trim()) return
      busy.set(true)
      try {
        const result = await mutations.updateProfile(name.get().trim())
        message.set(result.success ? "Profil gespeichert." : result.errorMessage)
      } finally {
        busy.set(false)
      }
    },
  }
}

export type KundenkontoPageState = ReturnType<typeof kundenkontoPageStateCreate>
