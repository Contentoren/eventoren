import { expect, test } from "bun:test"
import { adminEventOverviewSummaryCreate } from "./adminEventOverviewSummaryCreate.ts"

test("capacity is summed for a fully known tier list while paid tickets and buyers are counted", () => {
  const tickets = [
    { soldTicketCount: 1, pendingPaymentTicketCount: 0, buyerKey: "buyer" },
    { soldTicketCount: 1, pendingPaymentTicketCount: 0, buyerKey: "buyer" },
    { soldTicketCount: 0, pendingPaymentTicketCount: 1, buyerKey: null },
    { soldTicketCount: 0, pendingPaymentTicketCount: 0, buyerKey: "other" },
  ] as const
  expect(adminEventOverviewSummaryCreate(tickets, [{ capacity: 10 }, { capacity: 20 }])).toEqual({
    paidValidTicketCount: 2,
    pendingPaymentTicketCount: 1,
    distinctBuyerCount: 1,
    capacity: 30,
  })
  expect(
    adminEventOverviewSummaryCreate(
      tickets,
      Array.from({ length: 99 }, () => ({ capacity: 1 })),
    ).capacity,
  ).toBe(99)
})

test("capacity is omitted for capped or unknown tiers without hiding paid tickets and buyers", () => {
  const tickets = [{ soldTicketCount: 1, pendingPaymentTicketCount: 0, buyerKey: "buyer" }] as const
  for (const tiers of [
    Array.from({ length: 100 }, () => ({ capacity: 1 })),
    Array.from({ length: 101 }, () => ({ capacity: 1 })),
    [],
    [{ capacity: 0 }],
    [{ capacity: Number.MAX_SAFE_INTEGER }, { capacity: 1 }],
  ]) {
    expect(adminEventOverviewSummaryCreate(tickets, tiers)).toEqual({
      paidValidTicketCount: 1,
      pendingPaymentTicketCount: 0,
      distinctBuyerCount: 1,
      capacity: undefined,
    })
  }
})
