import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { demoFlowRouteCapabilityResolve } from "../src/demo/model/demoFlowRouteCapabilityResolve.ts"
import { demoScenarioSchema } from "../src/demo/model/demoScenarioSchema.ts"
import { demoScenarios } from "../src/demo/model/demoScenarios.ts"
import { demoScenarioText } from "../src/demo/model/demoScenarioText.ts"

describe("demo scenarios registry and routing", () => {
  test("all scenarios in demoScenarios conform to schema", () => {
    for (const scenario of demoScenarios) {
      const parsed = v.safeParse(demoScenarioSchema, scenario)
      expect(parsed.success).toBe(true)
    }
  })

  test("new admin scenarios exist with German copy", () => {
    const adminOrders = demoScenarios.find((s) => s.id === "admin-orders")
    expect(adminOrders).toBeDefined()
    if (!adminOrders) return
    expect(adminOrders.path).toBe("/demo/admin/orders")
    expect(adminOrders.title).toBe("Admin-Bestellungen")
    expect(demoScenarioText(adminOrders).title).toBe("Admin-Bestellungen")

    const adminMembers = demoScenarios.find((s) => s.id === "admin-members")
    expect(adminMembers).toBeDefined()
    if (!adminMembers) return
    expect(adminMembers.path).toBe("/demo/admin/members")
    expect(adminMembers.title).toBe("Admin-Mitglieder")
    expect(demoScenarioText(adminMembers).title).toBe("Admin-Mitglieder")

    const adminOrganizers = demoScenarios.find((s) => s.id === "admin-organizers")
    expect(adminOrganizers).toBeDefined()
    if (!adminOrganizers) return
    expect(adminOrganizers.path).toBe("/demo/admin/organizers")
    expect(adminOrganizers.title).toBe("Veranstalterverwaltung")
    expect(demoScenarioText(adminOrganizers).title).toBe("Veranstalterverwaltung")
  })

  test("existing admin scenarios remain intact", () => {
    const adminCatalog = demoScenarios.find((s) => s.id === "admin")
    expect(adminCatalog).toBeDefined()
    expect(adminCatalog?.path).toBe("/demo/admin/events")
    expect(adminCatalog?.title).toBe("Katalogverwaltung")

    const adminNew = demoScenarios.find((s) => s.id === "admin-new")
    expect(adminNew).toBeDefined()
    expect(adminNew?.path).toBe("/demo/admin/events/new")

    const adminEmpty = demoScenarios.find((s) => s.id === "admin-empty")
    expect(adminEmpty).toBeDefined()
    expect(adminEmpty?.path).toBe("/demo/admin/events-empty")

    const adminError = demoScenarios.find((s) => s.id === "admin-error")
    expect(adminError).toBeDefined()
    expect(adminError?.path).toBe("/demo/admin/events-error")

    const adminUnauthorized = demoScenarios.find((s) => s.id === "admin-unauthorized")
    expect(adminUnauthorized).toBeDefined()
    expect(adminUnauthorized?.path).toBe("/demo/admin/events-unauthorized")
  })

  test("new admin routes resolve to 4-state data-loading capability", () => {
    const routes = ["/demo/admin/orders", "/demo/admin/members", "/demo/admin/organizers"]
    for (const route of routes) {
      const capability = demoFlowRouteCapabilityResolve(route)
      expect(capability.isDataLoading).toBe(true)
      expect(capability.defaultState).toBe("loaded")
      expect(capability.supportedStates).toEqual(["loaded", "loading", "empty", "error"])
    }
  })
})
