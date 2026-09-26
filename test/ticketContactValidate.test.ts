import { expect, test } from "bun:test"
import { ticketContactEmpty } from "../src/ticketing/ticketContactEmpty.ts"
import { ticketContactValidate } from "../src/ticketing/ticketContactValidate.ts"

const completeContact = () => ({
  ...ticketContactEmpty(),
  firstName: "Ada",
  lastName: "Lovelace",
  email: "ada@example.test",
  address: "1 Main Street",
  postalCode: "10115",
  city: "Berlin",
  country: "DE",
})

test("requires the complete private billing address but leaves phone optional", () => {
  const contact = completeContact()
  expect(ticketContactValidate(contact)).toMatchObject({ success: true, data: { phone: "", address: "1 Main Street" } })
  expect(ticketContactValidate({ ...contact, postalCode: " " }).success).toBe(false)
  expect(ticketContactValidate({ ...contact, city: " " }).success).toBe(false)
  expect(ticketContactValidate({ ...contact, country: "D" }).success).toBe(false)
})

test("requires company name and validates an optional EU VAT identifier only for companies", () => {
  const contact = { ...completeContact(), billingKind: "company" as const }
  expect(ticketContactValidate(contact).success).toBe(false)
  expect(ticketContactValidate({ ...contact, companyName: "Analytical Engines", taxId: "DE123456789" }).success).toBe(
    true,
  )
  expect(ticketContactValidate({ ...contact, companyName: "Analytical Engines", taxId: "DE123" }).success).toBe(false)
  expect(ticketContactValidate({ ...completeContact(), taxId: "not-a-vat-id" }).success).toBe(true)
})
