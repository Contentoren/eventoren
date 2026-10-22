// Covers demo admin ticket-order wiring: default sort/status filter match the
// production page state so the demo preview behaves identically.
import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"

import { adminTicketOrderStatusKey } from "../../admin/adminTicketOrderStatusKey.ts"
import { demoAdminTicketOrdersPageStateCreate } from "./demoAdminTicketOrdersPageStateCreate.ts"

describe("demoAdminTicketOrdersPageStateCreate", () => {
  test("sorts newest first and filters by status", () => {
    createRoot((dispose: () => void) => {
      try {
        const state = demoAdminTicketOrdersPageStateCreate()
        expect(state.baseOrders().length).toBeGreaterThan(1)
        expect(state.sortBy()).toBe("datum")
        expect(state.sortOrder()).toBe("desc")

        const all = state.baseOrders()
        const first = all[0]
        if (!first) throw new Error("expected demo orders")
        const presentKey = adminTicketOrderStatusKey(first)
        const newest = all.map((order) => order.createdAt).reduce((a, b) => (a > b ? a : b))
        state.statusFilter.set(presentKey)
        expect(state.statusFilter.get()).toBe(presentKey)
        expect(state.orders().length).toBeGreaterThan(0)
        expect(state.orders().every((order) => adminTicketOrderStatusKey(order) === presentKey)).toBe(true)

        state.statusFilter.set("alle")
        state.sortToggle("kaeufer")
        expect(state.sortBy()).toBe("kaeufer")
        const buyerKey = (order: {
          customerGivenName?: string | null
          customerFamilyName?: string | null
          customerEmail: string
        }) => {
          const name = [order.customerGivenName, order.customerFamilyName].filter(Boolean).join(" ")
          return `${name || order.customerEmail} ${order.customerEmail}`.toLocaleLowerCase("de-DE")
        }
        const buyers = state.orders().map(buyerKey)
        expect([...buyers].sort((a, b) => a.localeCompare(b, "de-DE"))).toEqual(buyers)
        expect(state.statusCounts().alle).toBe(all.length)
        expect(state.statusCounts()[presentKey]).toBe(
          all.filter((order) => adminTicketOrderStatusKey(order) === presentKey).length,
        )
        expect(newest.length).toBeGreaterThan(0)
      } finally {
        dispose()
      }
    })
  })
})
