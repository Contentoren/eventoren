import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { catalogEventUpsert } from "../src/catalog/client/catalogEventUpsert.ts"
import type { CatalogEventUpsertInput } from "../src/catalog/client/CatalogEventUpsertInput.ts"

test("shows the underlying reason when the event mutation fails", async () => {
  const client = {
    mutation: async () => {
      throw new Error("Katalog nicht erreichbar")
    },
  } as unknown as ConvexHttpClient

  const result = await catalogEventUpsert({} as CatalogEventUpsertInput, client)

  expect(result.success).toBe(false)
  if (!result.success) {
    expect(result.errorMessage).toBe("Event konnte nicht gespeichert werden: Katalog nicht erreichbar")
  }
})

test.each([
  { selection: ["sepa_debit", "card", "sepa_debit"], expected: ["card", "sepa_debit"] },
  { selection: [], expected: undefined },
  { selection: undefined, expected: undefined },
])("normalizes the event payment policy before sending it: $selection", async ({ selection, expected }) => {
  let sent: CatalogEventUpsertInput | undefined
  const client = {
    mutation: async (_reference: unknown, input: CatalogEventUpsertInput) => {
      sent = input
      return { success: true, data: { eventKey: "event", catalogVersion: 1, eventRevision: 1 } }
    },
  } as unknown as ConvexHttpClient

  const result = await catalogEventUpsert({ allowedStripePaymentMethods: selection } as CatalogEventUpsertInput, client)

  expect(result.success).toBe(true)
  expect(sent?.allowedStripePaymentMethods).toEqual(expected ? [...expected] : undefined)
})

test.each(["wero", "allow_all", "unknown"])(
  "rejects unsupported policy value %s before calling Convex",
  async (method) => {
    let called = false
    const client = {
      mutation: async () => {
        called = true
      },
    } as unknown as ConvexHttpClient

    const result = await catalogEventUpsert(
      { allowedStripePaymentMethods: ["card", method] } as unknown as CatalogEventUpsertInput,
      client,
    )

    expect(result.success).toBe(false)
    expect(called).toBe(false)
  },
)
