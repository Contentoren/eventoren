import { describe, expect, test } from "bun:test"
import {
  veranstalterDashboardEventBaseFormEmpty,
  veranstalterDashboardEventFormValidate,
} from "./veranstalterDashboardEventFormValidate.ts"

const validForm = {
  ...veranstalterDashboardEventBaseFormEmpty,
  title: "Sommerfest",
  category: "Konzert",
  venue: "Stadthalle",
  city: "Berlin",
  startsAtLocal: "2027-06-01T20:00",
  endsAtLocal: "2027-06-01T23:00",
  doorsAtLocal: "2027-06-01T19:00",
}

describe("veranstalterDashboardEventFormValidate rejects invalid base input", () => {
  test("missing title fails before any backend call", () => {
    const result = veranstalterDashboardEventFormValidate({ ...validForm, title: "  " })
    expect(result.success).toBe(false)
  })

  test("end before start fails", () => {
    const result = veranstalterDashboardEventFormValidate({ ...validForm, endsAtLocal: "2027-06-01T19:00" })
    expect(result.success).toBe(false)
  })

  test("admission after start fails", () => {
    const result = veranstalterDashboardEventFormValidate({ ...validForm, doorsAtLocal: "2027-06-01T21:00" })
    expect(result.success).toBe(false)
  })

  test("malformed Berlin datetime fails", () => {
    const result = veranstalterDashboardEventFormValidate({ ...validForm, startsAtLocal: "01.06.2027 20:00" })
    expect(result.success).toBe(false)
  })
})

describe("veranstalterDashboardEventFormValidate converts Berlin wall time to UTC", () => {
  test("June CEST input persists as UTC instant", () => {
    const result = veranstalterDashboardEventFormValidate(validForm)
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.startsAt).toBe("2027-06-01T18:00:00.000Z")
    expect(result.data.endsAt).toBe("2027-06-01T21:00:00.000Z")
    expect(result.data.doorsAt).toBe("2027-06-01T17:00:00.000Z")
  })

  test("January CET input persists as UTC instant", () => {
    const result = veranstalterDashboardEventFormValidate({
      ...validForm,
      startsAtLocal: "2027-01-15T20:00",
      endsAtLocal: "2027-01-15T23:00",
      doorsAtLocal: "2027-01-15T19:00",
    })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.startsAt).toBe("2027-01-15T19:00:00.000Z")
  })
})
