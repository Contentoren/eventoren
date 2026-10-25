import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, mock } from "bun:test"

type BackendKind = "absent" | "own" | "own-changed" | "foreign" | "multiple" | "event-missing" | "error" | "throws"

type ProductScenario = {
  alertCount: number
  signInFails: boolean
  sessionToken: string | null
  sessionThrows: boolean
  backend: BackendKind
  backendSequence?: BackendKind[]
  toastFails: boolean
}

let scenario: ProductScenario = {
  alertCount: 0,
  signInFails: false,
  sessionToken: "session-token",
  sessionThrows: false,
  backend: "absent",
  backendSequence: undefined,
  toastFails: false,
}
const gotoUrls: string[] = []
const fills: Array<{ selector: string; value: string }> = []
const selections: Array<{ selector: string; value: string }> = []
const clicks: string[] = []
let catalogCalls = 0
let signInCalls = 0
const capturedClients: unknown[] = []

const developmentConvexUrl = "https://eventoren-convex.leonardomora.de"
const productionConvexUrl = "https://eventoren-convex.contentoren.de"
const developmentEnvironment: Record<string, string | undefined> = {
  E2E_TARGET: "development",
  E2E_BASE_URL: "https://eventoren.leonardomora.de",
  E2E_CLEANUP_CONVEX_URL: developmentConvexUrl,
}

function locatorMock(key: string, countValue = 0) {
  const locator: Record<string, unknown> = {
    __key: key,
    count: async () => countValue,
    click: async () => {
      clicks.push(key)
    },
    fill: async (value: string) => {
      fills.push({ selector: key, value })
    },
    selectOption: async (value: string) => {
      selections.push({ selector: key, value })
    },
  }
  return locator
}

const pageMock = {
  goto: async (url: string) => {
    gotoUrls.push(url)
  },
  evaluate: async () => {
    if (scenario.sessionThrows) throw new Error("/api/session unavailable")
    return scenario.sessionToken ? { token: scenario.sessionToken } : null
  },
  getByRole: (role: string, options?: { name?: string | RegExp }) => {
    const name = String(options?.name)
    if (role === "alert") return locatorMock("alert", scenario.alertCount)
    return locatorMock(`${role}:${name}`)
  },
  getByText: () => locatorMock("text"),
  locator: (selector: string) => locatorMock(selector),
}

function playwrightExpectMock(locator: { __key?: string } | undefined) {
  const key = locator?.__key ?? ""
  return {
    toBeVisible: async () => {
      // The obsolete success-toast contract (role=status "Ticketprodukt
      // gespeichert") must no longer gate completion. When toastFails is set,
      // any status visibility assertion fails to prove the step does not
      // depend on it.
      if (scenario.toastFails && key.startsWith("status:")) throw new Error("status toast unavailable")
    },
    toHaveAttribute: async () => {},
    toContainText: async () => {
      if (scenario.toastFails && key.startsWith("status:")) throw new Error("status toast unavailable")
    },
  }
}

function tierPayload(id: string, overrides: Record<string, unknown> = {}) {
  return {
    id,
    name: `Paid ticket ${runId}`,
    description: "",
    startsAt: "2026-10-26T10:00:00.000Z",
    doorsAt: "2026-10-26T10:00:00.000Z",
    endsAt: "2026-10-26T13:00:00.000Z",
    priceCents: 2400,
    feeCents: 0,
    capacity: 10,
    available: 10,
    sold: 0,
    sortOrder: 1,
    ...overrides,
  }
}

function backendKindAt(callIndex: number): BackendKind {
  const sequence = scenario.backendSequence
  if (!sequence || sequence.length === 0) return scenario.backend
  if (callIndex < sequence.length) return sequence[callIndex]!
  return sequence[sequence.length - 1]!
}

function backendPayload(kind: BackendKind) {
  const eventBase = { id: `ticket-e2e-${runId}`, title: `Ticket E2E ${runId}`, status: "draft" }
  if (kind === "own") return { success: true, data: [{ ...eventBase, tiers: [tierPayload("ticket-1")] }] }
  if (kind === "own-changed") return { success: true, data: [{ ...eventBase, tiers: [tierPayload("ticket-2")] }] }
  if (kind === "foreign")
    return { success: true, data: [{ ...eventBase, tiers: [tierPayload("ticket-9", { priceCents: 9900 })] }] }
  if (kind === "multiple")
    return {
      success: true,
      data: [{ ...eventBase, tiers: [tierPayload("ticket-1"), tierPayload("ticket-2", { feeCents: 100 })] }],
    }
  if (kind === "event-missing") return { success: true, data: [] }
  return { success: true, data: [{ ...eventBase, tiers: [] }] }
}

mock.module("@rstest/playwright", () => ({ expect: (locator: { __key?: string }) => playwrightExpectMock(locator) }))
mock.module("../ticketE2eAdminSignIn.ts", () => ({
  ticketE2eAdminSignIn: async () => {
    signInCalls += 1
    if (scenario.signInFails) throw new Error("Admin sign-in failed")
  },
}))
mock.module("#src/catalog/client/catalogEventsAdminList.ts", () => ({
  catalogEventsAdminList: async (token: string, client: unknown) => {
    const callIndex = catalogCalls
    catalogCalls += 1
    capturedClients.push(client)
    if (token !== "session-token")
      return { success: false, op: "catalogEventsAdminList", errorMessage: "Anmeldung erforderlich" }
    const kind = backendKindAt(callIndex)
    if (kind === "throws") throw new Error("convex unavailable")
    if (kind === "error")
      return {
        success: false,
        op: "catalogEventsAdminList",
        errorMessage: "Admin-Veranstaltungen konnten nicht geladen werden.",
      }
    return backendPayload(kind)
  },
}))

const { ticketPurchaseProductStep } = await import("./ticketPurchaseProductStep.ts")
const { e2eCheckpointSave } = await import("../../checkpoint/e2eCheckpointSave.ts")
const { e2eCheckpointLoad } = await import("../../checkpoint/e2eCheckpointLoad.ts")

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const baseUrl = "https://eventoren.leonardomora.de"
const target = { target: "development" as const, baseUrl: baseUrl as "https://eventoren.leonardomora.de" }
const eventKey = `ticket-e2e-${runId}`
const productName = `Paid ticket ${runId}`
const productsUrl = `${baseUrl}/admin/events/${encodeURIComponent(eventKey)}?tab=products`

function startedCheckpoint(ticketOverrides: Record<string, unknown> = {}) {
  return {
    version: 1 as const,
    target: "development" as const,
    baseUrl: baseUrl as "https://eventoren.leonardomora.de",
    runId,
    createdAt: 1_000_000,
    phase: "ticket-unreconciled" as const,
    ticket: {
      step: "event" as const,
      status: "completed" as const,
      eventKey,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
      eventId: eventKey,
      ...ticketOverrides,
    },
  }
}

function contextCreate(directory: string, checkpoint: ReturnType<typeof startedCheckpoint>) {
  return {
    page: pageMock,
    browser: {},
    baseUrl,
    directory,
    checkpoint: checkpoint as never,
    mail: { host: "localhost", port: 993, user: "buyer@example.test", password: "unused" },
    browserErrors: { record: () => {} },
  } as never
}

async function storedTicket(directory: string) {
  const loaded = await e2eCheckpointLoad(directory, target)
  if (!loaded.success || !loaded.data?.ticket) throw new Error("Checkpoint ticket missing")
  return loaded.data.ticket
}

function baseScenario(overrides: Partial<ProductScenario> = {}): ProductScenario {
  return {
    alertCount: 0,
    signInFails: false,
    sessionToken: "session-token",
    sessionThrows: false,
    backend: "absent",
    backendSequence: undefined,
    toastFails: false,
    ...overrides,
  }
}

function resetState() {
  gotoUrls.length = 0
  fills.length = 0
  selections.length = 0
  clicks.length = 0
  catalogCalls = 0
  signInCalls = 0
  capturedClients.length = 0
}

function fillValue(selector: string) {
  return fills.filter((fill) => fill.selector === selector).map((fill) => fill.value)
}

describe("ticket product authoritative backend identity instead of DOM draggable extraction", () => {
  it("fills split product dates and five-minute local times across midnight and the Berlin DST change", async () => {
    const previousTimezone = process.env.TZ
    try {
      for (const [timezone, startTime, endTime] of [
        ["UTC", "23:55", "02:55"],
        ["Europe/Berlin", "22:55", "01:55"],
      ] as const) {
        process.env.TZ = timezone
        const directory = await mkdtemp(join("/tmp/opencode", "eventoren-ticket-product-dates-"))
        try {
          scenario = baseScenario({ backendSequence: ["absent", "own"] })
          resetState()
          // The same fourteen elapsed days as EventStep cross Berlin's DST
          // change. Round once, then retain the exact three-hour window.
          const checkpoint = startedCheckpoint({
            step: "product",
            status: "started",
            mailSince: new Date(2026, 9, 13, 23, 51, 37).getTime(),
          })
          expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
          await ticketPurchaseProductStep(contextCreate(directory, checkpoint), { environment: developmentEnvironment })
          expect(fillValue("#admin-tier-starts")).toEqual(["2026-10-27"])
          expect(fillValue("#admin-tier-ends")).toEqual(["2026-10-28"])
          expect(selections).toEqual([
            { selector: "#admin-tier-starts-time", value: startTime },
            { selector: "#admin-tier-ends-time", value: endTime },
          ])
          // Keep event-inherited doors and other default fields unchanged.
          expect(fills.map((fill) => fill.selector)).toEqual([
            "#admin-tier-name",
            "#admin-tier-capacity",
            "#admin-tier-price",
            "#admin-tier-fee",
            "#admin-tier-starts",
            "#admin-tier-ends",
          ])
          const ticket = await storedTicket(directory)
          expect(ticket.eventId).toBe(eventKey)
          expect(ticket.productId).toBe("ticket-1")
          expect(ticket.status).toBe("completed")
          expect(clicks).toEqual(["button:Ticketprodukt speichern"])
          expect(catalogCalls).toBe(2)
        } finally {
          await rm(directory, { recursive: true, force: true })
        }
      }
    } finally {
      if (previousTimezone === undefined) delete process.env.TZ
      else process.env.TZ = previousTimezone
    }
  })

  it("creates once on authorized absence and records the same backend product id", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-absent-"))
    try {
      // Exact renderer tier data (name/price/fee, no draggable markup) is the
      // only product identity: the editor auto-generates ticket-N keys, so the
      // recorded id must equal the authoritative backend tier id.
      scenario = baseScenario({ backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseProductStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      expect(signInCalls).toBeGreaterThan(0)
      expect(gotoUrls).toContain(productsUrl)
      expect(fillValue("#admin-tier-name")).toEqual([productName])
      expect(fillValue("#admin-tier-capacity")).toEqual(["10"])
      expect(fillValue("#admin-tier-price")).toEqual(["24.00"])
      expect(fillValue("#admin-tier-fee")).toEqual(["0.00"])
      expect(clicks).toContain("button:Ticketprodukt speichern")
      expect(catalogCalls).toBeGreaterThanOrEqual(2)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("adopts the existing own product without a duplicate create", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-existing-"))
    try {
      scenario = baseScenario({ backend: "own" })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseProductStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      // No replacement created on top of the proven product.
      expect(fills).toEqual([])
      expect(clicks).toEqual([])
      expect(gotoUrls).toContain(productsUrl)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("completes without any UI toast when the backend persisted the owned tier", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-no-toast-"))
    try {
      // The DEV write submitted the same owned marker yet reported zero
      // status locators. Completion must come from the authoritative catalog,
      // never from role=status "Ticketprodukt gespeichert".
      scenario = baseScenario({ backendSequence: ["absent", "own"], toastFails: true })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseProductStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      expect(fillValue("#admin-tier-name")).toEqual([productName])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("stays started without mutation for foreign, ambiguous, missing, or unproven product state", async () => {
    const cases: Array<{ name: string; backend: BackendKind; extra?: Partial<ProductScenario> }> = [
      { name: "foreign-price", backend: "foreign" },
      { name: "multiple", backend: "multiple" },
      { name: "event-missing", backend: "event-missing" },
      { name: "query-error", backend: "error" },
      { name: "query-throws", backend: "throws" },
      { name: "session-missing", backend: "own", extra: { sessionToken: null } },
      { name: "session-throws", backend: "own", extra: { sessionThrows: true } },
      { name: "sign-in-fails", backend: "own", extra: { signInFails: true } },
    ]
    for (const entry of cases) {
      const directory = await mkdtemp(join(tmpdir(), `eventoren-ticket-product-${entry.name}-`))
      try {
        scenario = baseScenario({ backend: entry.backend, ...entry.extra })
        resetState()
        const checkpoint = startedCheckpoint()
        expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
        const context = contextCreate(directory, checkpoint)
        await expect(ticketPurchaseProductStep(context, { environment: developmentEnvironment })).rejects.toThrow()
        const ticket = await storedTicket(directory)
        expect(ticket.step).toBe("product")
        expect(ticket.status).toBe("started")
        expect(ticket.productId).toBeUndefined()
        expect(fills).toEqual([])
        expect(clicks).toEqual([])
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })

  it("retains started when the save cannot be proven in the authorized catalog", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-save-absent-"))
    try {
      // The submit was attempted with the same run intent but the
      // authoritative catalog never shows the row: stay started for a later
      // reconciling retry instead of recording an unproven id.
      scenario = baseScenario({ backend: "absent" })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await expect(ticketPurchaseProductStep(context, { environment: developmentEnvironment })).rejects.toThrow()
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("started")
      expect(ticket.productId).toBeUndefined()
      expect(fillValue("#admin-tier-name")).toEqual([productName])
      // One guard read plus bounded post-save polls, never unbounded.
      expect(catalogCalls).toBeGreaterThan(2)
      expect(catalogCalls).toBeLessThanOrEqual(13)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains started on an admin alert without adopting a missing row", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-alert-"))
    try {
      scenario = baseScenario({ alertCount: 1, backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await expect(ticketPurchaseProductStep(context, { environment: developmentEnvironment })).rejects.toThrow(
        "Admin reported a ticket product creation error",
      )
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("started")
      expect(ticket.productId).toBeUndefined()
      // The alert retains before any post-save poll adopts the row.
      expect(catalogCalls).toBe(1)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("proves completion by the same recorded backend id without recreating", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-completed-"))
    try {
      scenario = baseScenario({ backend: "own" })
      resetState()
      const checkpoint = startedCheckpoint({ step: "product", status: "completed", productId: "ticket-1" })
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseProductStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      expect(fills).toEqual([])
      expect(clicks).toEqual([])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("rejects completion when the recorded backend id changed or is missing", async () => {
    const cases: Array<{ name: string; backend: BackendKind; ticket: Record<string, unknown> }> = [
      {
        name: "changed-id",
        backend: "own-changed",
        ticket: { step: "product", status: "completed", productId: "ticket-1" },
      },
      { name: "foreign", backend: "foreign", ticket: { step: "product", status: "completed", productId: "ticket-1" } },
      { name: "absent", backend: "absent", ticket: { step: "product", status: "completed", productId: "ticket-1" } },
      { name: "missing-id", backend: "own", ticket: { step: "product", status: "completed", productId: undefined } },
    ]
    for (const entry of cases) {
      const directory = await mkdtemp(join(tmpdir(), `eventoren-ticket-product-proof-${entry.name}-`))
      try {
        scenario = baseScenario({ backend: entry.backend })
        resetState()
        const checkpoint = startedCheckpoint(entry.ticket)
        expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
        const context = contextCreate(directory, checkpoint)
        await expect(ticketPurchaseProductStep(context, { environment: developmentEnvironment })).rejects.toThrow()
        const ticket = await storedTicket(directory)
        expect(ticket.step).toBe("product")
        expect(ticket.status).toBe("completed")
        expect(fills).toEqual([])
        expect(clicks).toEqual([])
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })

  it("reconciles an uncertain started product through the exact authorized query", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-started-guard-"))
    try {
      // Product-started is permitted through the runner and the step guard
      // because this action proves the exact marker against the authorized
      // backend before creating or adopting: the proven own product is
      // adopted with the same run intent, never duplicated, never reset.
      scenario = baseScenario({ backend: "own" })
      resetState()
      const checkpoint = startedCheckpoint({ step: "product", status: "started" })
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseProductStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      expect(catalogCalls).toBeGreaterThan(0)
      expect(fills).toEqual([])
      expect(clicks).toEqual([])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})

describe("ticket product canonical backend binding", () => {
  it("queries the development canonical backend despite an ambient production VITE URL", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-canonical-"))
    try {
      // The default catalog client would resolve this ambient production URL
      // (or localhost) and miss the DEV run fixtures. The step must ignore it
      // and bind its explicit client to the invocation canonical DEV backend.
      const environment: Record<string, string | undefined> = {
        ...developmentEnvironment,
        VITE_CONVEX_URL: "https://convex.eventoren.de",
      }
      scenario = baseScenario({ backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseProductStep(context, { environment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      expect(catalogCalls).toBeGreaterThan(0)
      expect(capturedClients.length).toBe(catalogCalls)
      for (const client of capturedClients) {
        expect((client as { url?: unknown }).url).toBe(developmentConvexUrl)
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("refuses a foreign or missing backend pair before any query or creation", async () => {
    const cases: Array<{ name: string; environment: Record<string, string | undefined> }> = [
      {
        name: "missing-key",
        environment: {
          E2E_TARGET: "development",
          E2E_BASE_URL: "https://eventoren.leonardomora.de",
        },
      },
      {
        name: "foreign-prod-url",
        environment: {
          E2E_TARGET: "development",
          E2E_BASE_URL: "https://eventoren.leonardomora.de",
          E2E_CLEANUP_CONVEX_URL: productionConvexUrl,
        },
      },
      {
        name: "foreign-example-url",
        environment: {
          E2E_TARGET: "development",
          E2E_BASE_URL: "https://eventoren.leonardomora.de",
          E2E_CLEANUP_CONVEX_URL: "https://example.convex.cloud",
        },
      },
      {
        name: "cross-target-base",
        environment: {
          E2E_TARGET: "development",
          E2E_BASE_URL: "https://eventoren.de",
          E2E_CLEANUP_CONVEX_URL: developmentConvexUrl,
        },
      },
      {
        name: "production-target",
        environment: {
          E2E_TARGET: "production",
          E2E_BASE_URL: "https://eventoren.de",
          E2E_CLEANUP_CONVEX_URL: productionConvexUrl,
        },
      },
    ]
    for (const entry of cases) {
      const directory = await mkdtemp(join(tmpdir(), `eventoren-ticket-product-${entry.name}-`))
      try {
        scenario = baseScenario({ backendSequence: ["absent", "own"] })
        resetState()
        const checkpoint = startedCheckpoint()
        expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
        const context = contextCreate(directory, checkpoint)
        await expect(ticketPurchaseProductStep(context, { environment: entry.environment })).rejects.toThrow()
        const ticket = await storedTicket(directory)
        expect(ticket.step).toBe("product")
        expect(ticket.status).toBe("started")
        expect(ticket.productId).toBeUndefined()
        expect(catalogCalls).toBe(0)
        expect(fills).toEqual([])
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })

  it("uses the explicitly passed mock client instead of an ambient default", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-product-explicit-client-"))
    try {
      scenario = baseScenario({ backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      const mockClient = { mockClient: true }
      await ticketPurchaseProductStep(context, {
        environment: developmentEnvironment,
        client: mockClient as never,
      })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("product")
      expect(ticket.status).toBe("completed")
      expect(ticket.productId).toBe("ticket-1")
      expect(catalogCalls).toBeGreaterThan(0)
      expect(capturedClients.length).toBe(catalogCalls)
      for (const client of capturedClients) {
        expect(client).toBe(mockClient)
      }
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })
})
