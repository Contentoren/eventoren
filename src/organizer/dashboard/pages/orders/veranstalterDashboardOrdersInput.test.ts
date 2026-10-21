import { expect, test } from "bun:test"
import * as v from "valibot"
import { organizerDashboardOrderBuyerContactSchema } from "../../orders/model/organizerDashboardOrderBuyerContactSchema.ts"
import { organizerDashboardOrderParticipantUpdateSchema } from "../../orders/model/organizerDashboardOrderParticipantUpdateSchema.ts"
import { veranstalterDashboardOrdersSearchParse } from "./veranstalterDashboardOrdersSearchParse.ts"
import { veranstalterDashboardOrdersTimeFormat } from "./veranstalterDashboardOrdersTimeFormat.ts"

test("URL filters and selected order sheet use validated shared canonical status/search fields", () => {
  expect(
    veranstalterDashboardOrdersSearchParse({ org: "a", q: " hello ", status: "paid", order: "id", sheet: "order" }),
  ).toEqual({ org: "a", q: "hello", status: "paid", order: "id", sheet: "order" })
  expect(veranstalterDashboardOrdersSearchParse({ status: "refunded" })).toEqual({})
  expect(veranstalterDashboardOrdersSearchParse({ cursor: "x".repeat(32769) })).toEqual({})
  expect(veranstalterDashboardOrdersSearchParse({ sheet: "refund" })).toEqual({})
})
test("shared operational and holder inputs trim labels and reject invalid email/oversized fields", () => {
  expect(
    v.safeParse(organizerDashboardOrderBuyerContactSchema, { givenName: " Ops ", email: "ops@example.org" }).success,
  ).toBe(true)
  expect(v.safeParse(organizerDashboardOrderBuyerContactSchema, { givenName: "x".repeat(121) }).success).toBe(false)
  expect(v.safeParse(organizerDashboardOrderParticipantUpdateSchema, { participantEmail: "bad-address" }).success).toBe(
    false,
  )
  expect(
    v.safeParse(organizerDashboardOrderParticipantUpdateSchema, { participantEmail: "", participantName: "" }).success,
  ).toBe(true)
})
test("order instants always render in Berlin including summer and winter offsets", () => {
  expect(veranstalterDashboardOrdersTimeFormat("2026-07-01T12:00:00.000Z")).toBe("01.07.2026, 14:00 (Berlin)")
  expect(veranstalterDashboardOrdersTimeFormat("2026-01-01T12:00:00.000Z")).toBe("01.01.2026, 13:00 (Berlin)")
  expect(veranstalterDashboardOrdersTimeFormat("invalid")).toBe("—")
})
