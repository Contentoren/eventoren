import { describe, expect, test } from "bun:test"
import { demoOrganizerDataSourceCreate } from "../src/demo/fixtures/demoOrganizerDataSourceCreate.ts"
import { demoOrganizerScanScenarios } from "../src/demo/fixtures/demoOrganizerScanScenarios.ts"

describe("organizer demo datasource", () => {
  test("provides populated, empty and searchable local fixtures", async () => {
    const populated = demoOrganizerDataSourceCreate()
    const empty = demoOrganizerDataSourceCreate({ emptyEvents: true })

    expect((await populated.eventList("demo")).success).toBe(true)
    expect(await empty.eventList("demo")).toEqual({ success: true, data: [] })

    const result = await populated.ticketList("xyz", "Robin", "demo", { numItems: 50, cursor: null })
    expect(result.success).toBe(true)
    if (!result.success) return
    expect(result.data.page.map((ticket) => ticket.ticketNumber)).toEqual(["EVT-XYZ-0001"])
  })

  test("supports successful check-in, duplicate details, reset and re-check-in", async () => {
    const dataSource = demoOrganizerDataSourceCreate()
    const first = await dataSource.ticketCheckInCode("xyz", demoOrganizerScanScenarios.success, "demo")
    expect(first.success).toBe(true)
    if (!first.success) return

    const duplicate = await dataSource.ticketCheckInCode("xyz", demoOrganizerScanScenarios.success, "demo")
    expect(duplicate.success).toBe(false)
    if (duplicate.success) return
    expect(duplicate.errorCode).toBe("organizer.check-in.duplicate")
    expect(duplicate.errorData).toContain("Mara Demo")
    expect(duplicate.errorData).toContain("EVT-XYZ-0001")

    const reset = await dataSource.ticketReset("xyz", first.data.id, "demo")
    expect(reset.success).toBe(true)
    const rechecked = await dataSource.ticketCheckIn("xyz", first.data.id, "demo")
    expect(rechecked.success).toBe(true)
  })

  test("returns wrong-event, unknown, unpaid and cancelled outcomes", async () => {
    const dataSource = demoOrganizerDataSourceCreate()
    const scenarios = [
      [demoOrganizerScanScenarios.wrongEvent, "organizer.check-in.wrong-event"],
      [demoOrganizerScanScenarios.unknown, "organizer.check-in.unknown-ticket"],
      [demoOrganizerScanScenarios.unpaid, "organizer.check-in.unpaid"],
      [demoOrganizerScanScenarios.cancelled, "organizer.check-in.cancelled"],
    ] as const

    for (const [code, expectedError] of scenarios) {
      const result = await dataSource.ticketCheckInCode("xyz", code, "demo")
      expect(result.success).toBe(false)
      if (!result.success) expect(result.errorCode).toBe(expectedError)
    }
  })
})
