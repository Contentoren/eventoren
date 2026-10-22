import { expect, test } from "bun:test"
import { ticketContactEmpty } from "../src/ticketing/ticketContactEmpty.ts"

test("new checkout contacts prefill the country with DE by default", () => {
  expect(ticketContactEmpty().country).toBe("DE")
})

test("new checkout contacts start with otherwise blank fields", () => {
  const contact = ticketContactEmpty()
  expect({ ...contact, country: "" }).toEqual({
    firstName: "",
    lastName: "",
    email: "",
    companyName: "",
    address: "",
    addressLine2: "",
    postalCode: "",
    city: "",
    country: "",
    phone: "",
    billingKind: "person",
    companyExtra: "",
    taxId: "",
  })
})
