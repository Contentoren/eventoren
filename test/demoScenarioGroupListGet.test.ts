import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { demoScenarioGroupListGet } from "../src/demo/model/demoScenarioGroupListGet.ts"
import { demoScenarioGroupSchema } from "../src/demo/model/demoScenarioGroupSchema.ts"
import { demoScenarios } from "../src/demo/model/demoScenarios.js"

describe("demoScenarioGroupListGet", () => {
  test("returns 4 groups conforming to demoScenarioGroupSchema", () => {
    const groups = demoScenarioGroupListGet()
    expect(groups).toHaveLength(4)

    for (const group of groups) {
      const parsed = v.safeParse(demoScenarioGroupSchema, group)
      expect(parsed.success).toBe(true)
    }

    expect(groups.map((g) => g.id)).toEqual(["customer", "platform", "admin", "shared"])
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

  test("platform group has dashboard entry path and fullscreen scenarios", () => {
    const [, platform] = demoScenarioGroupListGet()
    expect(platform?.id).toBe("platform")
    expect(platform?.title).toBe("Veranstalter-Plattform")
    expect(platform?.entryPath).toBe("/demo/dashboard")
    expect(platform?.entryLabel).toBe("Zum Veranstalter-Dashboard")
    expect(platform?.scenarios.length).toBeGreaterThan(0)

    for (const scenario of platform?.scenarios ?? []) {
      const inPlatform =
        scenario.path === "/demo/dashboard" ||
        scenario.path.startsWith("/demo/dashboard/") ||
        scenario.path === "/demo/onboarding" ||
        scenario.path.startsWith("/demo/kasse/") ||
        scenario.path.startsWith("/demo/abendkasse/")
      expect(inPlatform).toBe(true)
    }

    const dashboardScenario = platform?.scenarios.find((s) => s.id === "platform-dashboard")
    expect(dashboardScenario).toBeDefined()
    expect(dashboardScenario?.path).toBe("/demo/dashboard")
  })

  test("customer group keeps public organizer and account scenarios", () => {
    const [customer] = demoScenarioGroupListGet()
    const organizerProfile = customer?.scenarios.find((s) => s.id === "customer-organizer-profile")
    expect(organizerProfile).toBeDefined()
    expect(organizerProfile?.path).toBe("/demo/customer/veranstalter/kulturhaus-lindenhof")

    const account = customer?.scenarios.find((s) => s.id === "customer-account")
    expect(account).toBeDefined()
    expect(account?.path).toBe("/demo/customer/konto")
  })

  test("admin group includes platform admin destinations", () => {
    const [, , admin] = demoScenarioGroupListGet()
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

    const orgsScenario = admin?.scenarios.find((s) => s.id === "admin-orgs")
    expect(orgsScenario).toBeDefined()
    expect(orgsScenario?.path).toBe("/demo/admin/organisationen")

    const payoutsScenario = admin?.scenarios.find((s) => s.id === "admin-payouts")
    expect(payoutsScenario).toBeDefined()
    expect(payoutsScenario?.path).toBe("/demo/admin/auszahlungen")
  })

  test("shared group contains non-customer non-admin scenarios without directory", () => {
    const [, , , shared] = demoScenarioGroupListGet()
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
