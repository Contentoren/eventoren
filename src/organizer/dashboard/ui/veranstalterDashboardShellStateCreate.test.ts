import { describe, expect, test } from "bun:test"
import { createResult, createResultError, type Result } from "#result"
import type { VeranstalterDashboardSource } from "../client/VeranstalterDashboardSource.ts"
import type { VeranstalterDashboardActiveOrganization } from "../client/veranstalterDashboardActiveOrganizationSchema.ts"
import type { VeranstalterDashboardContext } from "../client/veranstalterDashboardContextSchema.ts"
import type { VeranstalterDashboardOrganization } from "../client/veranstalterDashboardOrganizationSchema.ts"
import { veranstalterDashboardShellStateCreate } from "./veranstalterDashboardShellStateCreate.ts"

const orgA: VeranstalterDashboardOrganization = {
  id: "org_a",
  name: "Kulturhaus Lindenhof",
  slug: "kulturhaus-lindenhof",
  role: "admin",
  status: "aktiv",
}

const orgB: VeranstalterDashboardOrganization = {
  id: "org_b",
  name: "Stadtfest e. V.",
  slug: "stadtfest",
  role: "eventmanager",
  status: "aktiv",
}

const activeA: VeranstalterDashboardActiveOrganization = {
  ...orgA,
  permissions: ["bestellungen.sehen"],
  profile: { name: "Kulturhaus Lindenhof", slug: "kulturhaus-lindenhof" },
}

function sourceWith(result: Result<VeranstalterDashboardContext> | undefined): VeranstalterDashboardSource {
  return { contextResult: () => result }
}

function stateWith(options: {
  readonly result: Result<VeranstalterDashboardContext> | undefined
  readonly authReady?: boolean
  readonly authenticated?: boolean
  readonly orgId?: string | undefined
}) {
  return veranstalterDashboardShellStateCreate({
    source: sourceWith(options.result),
    authReady: () => options.authReady ?? true,
    authenticated: () => options.authenticated ?? true,
    orgId: () => options.orgId,
    selectOrganization: () => undefined,
  })
}

describe("veranstalterDashboardShellStateCreate view classification", () => {
  test("loading solange Auth oder Kontext noch nicht bereit sind", () => {
    expect(stateWith({ result: undefined, authReady: false }).view()).toBe("loading")
    expect(stateWith({ result: undefined }).view()).toBe("loading")
  })

  test("login für abgemeldete Besucher", () => {
    expect(stateWith({ result: undefined, authenticated: false }).view()).toBe("login")
  })

  test("empty ohne Organisationen", () => {
    const state = stateWith({ result: createResult({ organizations: [], activeOrganization: null }) })
    expect(state.view()).toBe("empty")
  })

  test("ready mit einer Organisation ohne Auswahl", () => {
    const state = stateWith({
      result: createResult({ organizations: [orgA], activeOrganization: activeA }),
    })
    expect(state.view()).toBe("ready")
    expect(state.roleLabel()).toBe("Admin")
    expect(state.statusLabel()).toBe("Aktiv")
  })

  test("select bei mehreren Organisationen ohne Auswahl", () => {
    const state = stateWith({
      result: createResult({ organizations: [orgA, orgB], activeOrganization: null }),
    })
    expect(state.view()).toBe("select")
    expect(state.requestedOrgUnknown()).toBe(false)
  })

  test("ready bei explizit gewählter Organisation", () => {
    const state = stateWith({
      result: createResult({ organizations: [orgA, orgB], activeOrganization: activeA }),
      orgId: "org_a",
    })
    expect(state.view()).toBe("ready")
    expect(state.requestedOrgUnknown()).toBe(false)
  })
})

describe("team navigation permission", () => {
  test("uses the exact active organization's team.verwalten permission, not its role label", () => {
    const withTeam = stateWith({
      result: createResult({
        organizations: [orgA],
        activeOrganization: { ...activeA, role: "eventmanager", permissions: ["team.verwalten"] },
      }),
    })
    expect(withTeam.canManageTeam()).toBe(true)
    const withoutTeam = stateWith({ result: createResult({ organizations: [orgA], activeOrganization: activeA }) })
    expect(withoutTeam.canManageTeam()).toBe(false)
    const similarPermission = stateWith({
      result: createResult({
        organizations: [orgA],
        activeOrganization: { ...activeA, permissions: ["team.verwalten.extra"] },
      }),
    })
    expect(similarPermission.canManageTeam()).toBe(false)
  })

  test("updates when active organization changes and is false for absent or failed context", () => {
    let result: Result<VeranstalterDashboardContext> | undefined = createResult({
      organizations: [orgA, orgB],
      activeOrganization: { ...activeA, permissions: ["team.verwalten"] },
    })
    const state = veranstalterDashboardShellStateCreate({
      source: { contextResult: () => result },
      authReady: () => true,
      authenticated: () => true,
      orgId: () => undefined,
      selectOrganization: () => undefined,
    })
    expect(state.canManageTeam()).toBe(true)
    result = createResult({
      organizations: [orgA, orgB],
      activeOrganization: { ...activeA, id: orgB.id, permissions: ["events.bearbeiten"] },
    })
    expect(state.canManageTeam()).toBe(false)
    result = createResult({ organizations: [], activeOrganization: null })
    expect(state.canManageTeam()).toBe(false)
    result = createResultError("context", "Unavailable")
    expect(state.canManageTeam()).toBe(false)
    result = undefined
    expect(state.canManageTeam()).toBe(false)
  })
})

describe("order navigation permission", () => {
  test("requires exact bestellungen.sehen, not admin role, order-manage or entry permission", () => {
    expect(
      stateWith({ result: createResult({ organizations: [orgA], activeOrganization: activeA }) }).canReadOrders(),
    ).toBe(true)
    for (const permissions of [[], ["bestellungen.verwalten"], ["einlass.nutzen"], ["bestellungen.sehen.extra"]]) {
      expect(
        stateWith({
          result: createResult({ organizations: [orgA], activeOrganization: { ...activeA, permissions } }),
        }).canReadOrders(),
      ).toBe(false)
    }
  })
  test("tracks active organization replacement, missing context and failure without caching permissions", () => {
    let result: Result<VeranstalterDashboardContext> | undefined = createResult({
      organizations: [orgA],
      activeOrganization: activeA,
    })
    const state = veranstalterDashboardShellStateCreate({
      source: { contextResult: () => result },
      authReady: () => true,
      authenticated: () => true,
      orgId: () => undefined,
      selectOrganization: () => undefined,
    })
    expect(state.canReadOrders()).toBe(true)
    result = createResult({
      organizations: [orgB],
      activeOrganization: { ...activeA, id: orgB.id, permissions: ["einlass.nutzen"] },
    })
    expect(state.canReadOrders()).toBe(false)
    result = createResult({ organizations: [], activeOrganization: null })
    expect(state.canReadOrders()).toBe(false)
    result = createResultError("context", "Unavailable")
    expect(state.canReadOrders()).toBe(false)
    result = undefined
    expect(state.canReadOrders()).toBe(false)
  })
})

describe("veranstalterDashboardShellStateCreate selected org failures", () => {
  test("select mit Hinweis bei unbekannter angeforderter Organisation", () => {
    const state = stateWith({
      result: createResult({ organizations: [orgA], activeOrganization: null }),
      orgId: "org_unbekannt",
    })
    expect(state.view()).toBe("select")
    expect(state.requestedOrgUnknown()).toBe(true)
  })

  test("error mit Backend-Meldung bei fehlgeschlagener Auswahl", () => {
    const state = stateWith({
      result: createResultError("organizerDashboardContextQuery", "Organisation nicht gefunden"),
      orgId: "org_unbekannt",
    })
    expect(state.view()).toBe("error")
    expect(state.errorMessage()).toBe("Organisation nicht gefunden")
  })

  test("error ohne Auswahl bei allgemeinem Kontextfehler", () => {
    const state = stateWith({
      result: createResultError("organizerDashboardContextQuery", "Später erneut versuchen"),
    })
    expect(state.view()).toBe("error")
    expect(state.errorMessage()).toBe("Später erneut versuchen")
  })
})
