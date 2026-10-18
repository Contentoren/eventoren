import { expect, test } from "bun:test"

import { dashTicketFormCreate } from "./dashTicketFormCreate.ts"
import { dashTicketFormIsValid, dashTicketFormValidate } from "./dashTicketFormValidate.ts"
import { dashTicketFormToInput } from "./dashTicketFormToInput.ts"

function validForm() {
  const form = dashTicketFormCreate({
    name: "Standard",
    capacity: 100,
    maxPerOrder: 10,
    phases: [{ id: "ph-1", name: "Regulär", priceCents: 2200, endsAt: null, quota: null }],
  })
  return form
}

test("dashTicketFormValidate akzeptiert ein gültiges Formular", () => {
  const errors = dashTicketFormValidate(validForm(), 0)
  expect(dashTicketFormIsValid(errors)).toBe(true)
})

test("dashTicketFormValidate meldet fehlenden Namen und leere Phasenpreise", () => {
  const form = validForm()
  form.name.set("  ")
  form.phases.get()[0]?.priceCents.set(null)
  const errors = dashTicketFormValidate(form, 0)
  expect(errors.name).toBe("Bitte gib einen Namen ein.")
  expect(dashTicketFormIsValid(errors)).toBe(false)
})

test("dashTicketFormValidate meldet Kontingent unter verkauften Tickets", () => {
  const form = validForm()
  form.capacity.set(5)
  const errors = dashTicketFormValidate(form, 12)
  expect(errors.capacity).toContain("12")
  expect(dashTicketFormIsValid(errors)).toBe(false)
})

test("dashTicketFormValidate verlangt aufsteigende Phasen-Enddaten", () => {
  const form = dashTicketFormCreate({
    name: "Standard",
    capacity: 100,
    maxPerOrder: 10,
    phases: [
      { id: "ph-1", name: "Early Bird", priceCents: 1800, endsAt: "2026-09-01T10:00:00.000Z", quota: null },
      { id: "ph-2", name: "Regulär", priceCents: 2200, endsAt: "2026-08-01T10:00:00.000Z", quota: null },
    ],
  })
  const errors = dashTicketFormValidate(form, 0)
  expect(errors.phaseEnds["ph-2"]).toContain("aufsteigen")
})

test("dashTicketFormToInput übernimmt Event, trimmt Namen und setzt null-Zeiten bei sofort/Eventbeginn", () => {
  const form = validForm()
  form.name.set("  Standard  ")
  const input = dashTicketFormToInput({ form, eventId: "ev-jazz-wein", existingPhaseIds: new Set(["ph-1"]) })
  expect(input.eventId).toBe("ev-jazz-wein")
  expect(input.name).toBe("Standard")
  expect(input.salesStartAt).toBeNull()
  expect(input.salesEndAt).toBeNull()
  expect(input.phases[0]?.id).toBe("ph-1")
})
