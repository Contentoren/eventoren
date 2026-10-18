import { describe, expect, test } from "bun:test"
import { dashSeedCreate } from "../../store/seed/dashSeedCreate.ts"
import { dashAccountOrders } from "./dashAccountOrders.ts"

const seedNow = new Date("2026-10-18T18:00:00+02:00")

describe("dashAccountOrders", () => {
  test("findet Leas drei Bestellungen, neueste zuerst", () => {
    const state = dashSeedCreate(seedNow)
    const rows = dashAccountOrders({
      orders: state.orders,
      events: state.events,
      email: "lea.schneider@example.de",
    })
    expect(rows.length).toBe(3)
    expect(rows.every((row) => row.order.buyer.email === "lea.schneider@example.de")).toBe(true)
    const first = rows[0]?.order.createdAt ?? ""
    const second = rows[1]?.order.createdAt ?? ""
    expect(first >= second).toBe(true)
    const erstattet = rows.find((row) => row.order.status === "erstattet")
    expect(erstattet?.order.refunds.length).toBeGreaterThan(0)
    expect(erstattet?.eventTitle.length).toBeGreaterThan(1)
  })

  test("matcht die E-Mail case-insensitive", () => {
    const state = dashSeedCreate(seedNow)
    const args = { orders: state.orders, events: state.events }
    const ids = (email: string) => dashAccountOrders({ ...args, email }).map((row) => row.order.id)
    expect(ids("LEA.SCHNEIDER@EXAMPLE.DE")).toEqual(ids("lea.schneider@example.de"))
  })

  test("unbekannte E-Mail liefert leere Liste", () => {
    const state = dashSeedCreate(seedNow)
    const rows = dashAccountOrders({ orders: state.orders, events: state.events, email: "niemand@example.de" })
    expect(rows).toEqual([])
  })
})
