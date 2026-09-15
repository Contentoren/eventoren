import { expect, test } from "bun:test"
import { ticketParticipantNamesAlign } from "../src/ticketing/ticketParticipantNamesAlign.ts"
import { ticketParticipantNamesValidate } from "../src/ticketing/ticketParticipantNamesValidate.ts"

const items = [
  {
    event: { id: "event-a" },
    cart: {
      lines: [
        { tierId: "standard", quantity: 2 },
        { tierId: "vip", quantity: 1 },
      ],
    },
  },
  { event: { id: "event-b" }, cart: { lines: [{ tierId: "standard", quantity: 1 }] } },
]

test("keeps participant names separated by event, line, and ticket index", () => {
  const aligned = ticketParticipantNamesAlign(
    {
      "event-a": { standard: ["Ada", "Grace"], vip: ["Linus"] },
      "event-b": { standard: ["Margaret"] },
    },
    items,
  )

  expect(aligned).toEqual({
    "event-a": { standard: ["Ada", "Grace"], vip: ["Linus"] },
    "event-b": { standard: ["Margaret"] },
  })
})

test("preserves names by index while quantities change", () => {
  const increased = ticketParticipantNamesAlign({ "event-a": { standard: ["Ada", "Grace"] } }, [
    { event: { id: "event-a" }, cart: { lines: [{ tierId: "standard", quantity: 3 }] } },
  ])
  expect(increased["event-a"]?.standard).toEqual(["Ada", "Grace", ""])

  const decreased = ticketParticipantNamesAlign(increased, [
    { event: { id: "event-a" }, cart: { lines: [{ tierId: "standard", quantity: 1 }] } },
  ])
  expect(decreased["event-a"]?.standard).toEqual(["Ada"])
})

test("requires and trims every participant name", () => {
  const invalid = ticketParticipantNamesValidate(
    { "event-a": { standard: ["Ada", "  "], vip: ["Linus"] }, "event-b": { standard: ["Margaret"] } },
    items,
    "required",
  )
  expect(invalid.success).toBe(false)

  const valid = ticketParticipantNamesValidate(
    { "event-a": { standard: [" Ada ", "Grace"], vip: ["Linus"] }, "event-b": { standard: ["Margaret"] } },
    items,
    "required",
  )
  expect(valid.success).toBe(true)
  if (valid.success) expect(valid.data["event-a"]?.standard).toEqual(["Ada", "Grace"])
})
