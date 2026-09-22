import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { demoScenarioGroupListGet } from "../src/demo/model/demoScenarioGroupListGet.ts"
import { demoScenarioGroupSchema } from "../src/demo/model/demoScenarioGroupSchema.ts"
import { demoScenarios } from "../src/demo/model/demoScenarios.js"

describe("demoScenarioGroupListGet", () => {
  test("returns 3 groups conforming to demoScenarioGroupSchema", () => {
    const groups = demoScenarioGroupListGet()
    expect(groups).toHaveLength(3)

    for (const group of groups) {
      const parsed = v.safeParse(demoScenarioGroupSchema, group)
      expect(parsed.success).toBe(true)
    }

    expect(groups.map((g) => g.id)).toEqual(["customer", "admin", "shared"])
  })

  test("customer group has valid entry path and customer scenarios", () => {
    const [customer] = demoScenarioGroupListGet()
    expect(customer?.id).toBe("customer")
    expect(customer?.title).toBe("Kunden")
    expect(customer?.entryPath).toBe("/demo/customer/events")
    expect(customer?.entryLabel).toBe("Zum Eventkatalog")
    expect(customer?.scenarios.length).toBeGreaterThan(0)

    for (const scenario of customer?.scenarios ?? []) {
      expect(scenario.path.startsWith("/demo/customer/")).toBe(true)
    }
  })

  test("admin group includes admin routes and organizer check-in scanning", () => {
    const [, admin] = demoScenarioGroupListGet()
    expect(admin?.id).toBe("admin")
    expect(admin?.title).toBe("Administration (inkl. Ticket-Scan)")
    expect(admin?.entryPath).toBe("/demo/admin/events")
    expect(admin?.entryLabel).toBe("Zur Katalogverwaltung")
    expect(admin?.scenarios.length).toBeGreaterThan(0)

    for (const scenario of admin?.scenarios ?? []) {
      expect(scenario.path.startsWith("/demo/admin/")).toBe(true)
    }

    const organizerScanScenario = admin?.scenarios.find((s) => s.id === "organizer-event")
    expect(organizerScanScenario).toBeDefined()
    expect(organizerScanScenario?.path).toBe("/demo/admin/organizer/event/xyz")

    const organizerListScenario = admin?.scenarios.find((s) => s.id === "organizer")
    expect(organizerListScenario).toBeDefined()
    expect(organizerListScenario?.path).toBe("/demo/admin/organizer")
  })

  test("shared group contains non-customer non-admin scenarios without directory", () => {
    const [, , shared] = demoScenarioGroupListGet()
    expect(shared?.id).toBe("shared")
    expect(shared?.title).toBe("Gemeinsame Beispiele")
    expect(shared?.entryPath).toBe("/demo/contact")
    expect(shared?.scenarios.length).toBeGreaterThan(0)

    for (const scenario of shared?.scenarios ?? []) {
      expect(scenario.path.startsWith("/demo/customer/")).toBe(false)
      expect(scenario.path.startsWith("/demo/admin/")).toBe(false)
      expect(scenario.id).not.toBe("directory")
    }
  })

  test("partitions all non-directory demoScenarios without omission or duplicate", () => {
    const groups = demoScenarioGroupListGet()
    const nonDirectoryScenarios = demoScenarios.filter((s) => s.id !== "directory")
    const allGroupedScenarios = groups.flatMap((g) => g.scenarios)

    expect(allGroupedScenarios.length).toBe(nonDirectoryScenarios.length)

    const groupScenarioIds = allGroupedScenarios.map((s) => s.id)
    const expectedIds = nonDirectoryScenarios.map((s) => s.id)
    expect(groupScenarioIds.sort()).toEqual(expectedIds.sort())
  })
})
