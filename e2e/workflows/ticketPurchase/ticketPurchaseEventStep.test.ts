import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { describe, expect, it, mock } from "bun:test"

type BackendKind = "absent" | "own" | "foreign" | "multiple" | "error" | "throws" | "wrong-status"

type EventScenario = {
  headingCount: number
  formCount: number
  alertCount: number
  signInFails: boolean
  sessionToken: string | null
  sessionThrows: boolean
  backend: BackendKind
  backendSequence?: BackendKind[]
  toastFails: boolean
}

let scenario: EventScenario = {
  headingCount: 0,
  formCount: 0,
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
const timeSelections: Array<{ selector: string; value: string }> = []
let catalogCalls = 0
const capturedClients: unknown[] = []

const developmentConvexUrl = "https://eventoren-convex.leonardomora.de"
const productionConvexUrl = "https://eventoren-convex.contentoren.de"
const developmentEnvironment: Record<string, string | undefined> = {
  E2E_TARGET: "development",
  E2E_BASE_URL: "https://eventoren.leonardomora.de",
  E2E_CLEANUP_CONVEX_URL: developmentConvexUrl,
}

function locatorMock(key: string, countValue: number) {
  const locator: Record<string, unknown> = {
    __key: key,
    count: async () => countValue,
    click: async () => {},
    fill: async (value: string) => {
      if (/^#admin-event-(starts|doors|ends)$/u.test(key) && !/^\d{4}-\d{2}-\d{2}$/u.test(value))
        throw new Error("Split event date inputs accept only YYYY-MM-DD")
      fills.push({ selector: key, value })
    },
    selectOption: async (value: string) => {
      if (!/^\d{2}:\d[05]$/u.test(value)) throw new Error("Event time must be an available five-minute slot")
      timeSelections.push({ selector: key, value })
    },
    or: () => locator,
    first: () => locator,
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
    if (role === "heading") return locatorMock(`heading:${name}`, scenario.headingCount)
    if (role === "alert") return locatorMock("alert", scenario.alertCount)
    return locatorMock(`${role}:${name}`, 0)
  },
  getByText: () => locatorMock("text", 0),
  locator: (selector: string) => {
    if (selector === "form:has(#admin-event-title)") return locatorMock(selector, scenario.formCount)
    return locatorMock(selector, 0)
  },
}

function playwrightExpectMock(locator: { __key?: string } | undefined) {
  const key = locator?.__key ?? ""
  return {
    toBeVisible: async () => {
      // The obsolete success-toast contract (role=status "Event gespeichert")
      // must no longer gate completion. When toastFails is set, any status
      // visibility assertion fails to prove the step does not depend on it.
      if (scenario.toastFails && key.startsWith("status:")) throw new Error("status toast unavailable")
    },
    toHaveAttribute: async () => {},
    toContainText: async () => {
      if (scenario.toastFails && key.startsWith("status:")) throw new Error("status toast unavailable")
    },
  }
}

function backendKindAt(callIndex: number): BackendKind {
  const sequence = scenario.backendSequence
  if (!sequence || sequence.length === 0) return scenario.backend
  if (callIndex < sequence.length) return sequence[callIndex]!
  return sequence[sequence.length - 1]!
}

function backendPayload(kind: BackendKind) {
  if (kind === "own")
    return { success: true, data: [{ id: `ticket-e2e-${runId}`, title: `Ticket E2E ${runId}`, status: "draft" }] }
  if (kind === "foreign")
    return { success: true, data: [{ id: `ticket-e2e-${runId}`, title: "Fremdes Event", status: "draft" }] }
  if (kind === "wrong-status")
    return { success: true, data: [{ id: `ticket-e2e-${runId}`, title: `Ticket E2E ${runId}`, status: "published" }] }
  if (kind === "multiple")
    return {
      success: true,
      data: [
        { id: `ticket-e2e-${runId}`, title: `Ticket E2E ${runId}`, status: "draft" },
        { id: `ticket-e2e-${runId}`, title: `Ticket E2E ${runId}`, status: "draft" },
      ],
    }
  return { success: true, data: [] }
}

mock.module("@rstest/playwright", () => ({ expect: (locator: { __key?: string }) => playwrightExpectMock(locator) }))
mock.module("../ticketE2eAdminSignIn.ts", () => ({
  ticketE2eAdminSignIn: async () => {
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

const { ticketPurchaseEventStep } = await import("./ticketPurchaseEventStep.ts")
const { e2eCheckpointSave } = await import("../../checkpoint/e2eCheckpointSave.ts")
const { e2eCheckpointLoad } = await import("../../checkpoint/e2eCheckpointLoad.ts")

const runId = "abc-12345678-1234-1234-1234-123456789abc"
const baseUrl = "https://eventoren.leonardomora.de"
const target = { target: "development" as const, baseUrl: baseUrl as "https://eventoren.leonardomora.de" }

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
      status: "started" as const,
      eventKey: `ticket-e2e-${runId}`,
      eventTitle: `Ticket E2E ${runId}`,
      participantName: `E2E Participant ${runId}`,
      mailSince: 1_000_000,
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

function baseScenario(overrides: Partial<EventScenario> = {}): EventScenario {
  return {
    headingCount: 0,
    formCount: 0,
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
  timeSelections.length = 0
  catalogCalls = 0
  capturedClients.length = 0
}

describe("ticket event reconciliation before replacement", () => {
  it("fills separate local dates and five-minute time selects while preserving doors and duration across midnight", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-split-datetime-"))
    try {
      scenario = baseScenario({ backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint({
        mailSince: new Date(2026, 9, 27, 23, 51, 17).getTime() - 14 * 24 * 60 * 60_000,
      })
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      await ticketPurchaseEventStep(contextCreate(directory, checkpoint), { environment: developmentEnvironment })
      expect(fills.filter((fill) => /^#admin-event-(starts|doors|ends)$/u.test(fill.selector))).toEqual([
        { selector: "#admin-event-starts", value: "2026-10-27" },
        { selector: "#admin-event-doors", value: "2026-10-27" },
        { selector: "#admin-event-ends", value: "2026-10-28" },
      ])
      expect(timeSelections).toEqual([
        { selector: "#admin-event-starts-time", value: "23:55" },
        { selector: "#admin-event-doors-time", value: "23:25" },
        { selector: "#admin-event-ends-time", value: "02:55" },
      ])
      expect((await storedTicket(directory)).status).toBe("completed")
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("creates once with the same UUID on explicitly authorized absence", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-absent-"))
    try {
      // Zero UI counts alone prove nothing (loading renders the same empty
      // detail state); creation is permitted only by the authorized backend
      // proving the exact key absent.
      scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseEventStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("completed")
      expect(ticket.eventId).toBe(`ticket-e2e-${runId}`)
      // Same run/event intent reused, exact pending step created once.
      expect(fills.filter((fill) => fill.selector === "#admin-event-key").map((fill) => fill.value)).toEqual([
        `ticket-e2e-${runId}`,
      ])
      expect(gotoUrls.some((url) => url.endsWith("/admin/events/new"))).toBe(true)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("completes without any UI toast when the backend persisted the owned draft", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-no-toast-"))
    try {
      // The DEV 13:36 write submitted the same owned key yet reported zero
      // status locators. Completion must come from the authoritative catalog,
      // never from role=status "Event gespeichert".
      scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", "own"], toastFails: true })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseEventStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("completed")
      expect(ticket.eventId).toBe(`ticket-e2e-${runId}`)
      expect(fills.filter((fill) => fill.selector === "#admin-event-key").map((fill) => fill.value)).toEqual([
        `ticket-e2e-${runId}`,
      ])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("completes within the bound when a delayed query then matches the owned draft", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-delayed-"))
    try {
      scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", "absent", "absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseEventStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("completed")
      expect(ticket.eventId).toBe(`ticket-e2e-${runId}`)
      // One guard read plus bounded post-save polls, never unbounded.
      expect(catalogCalls).toBeGreaterThan(2)
      expect(catalogCalls).toBeLessThanOrEqual(13)
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains started when the save fails and the backend stays absent", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-save-absent-"))
    try {
      // The submit was attempted (same owned key filled) but the authoritative
      // catalog never shows the row: stay started for the lost-response retry,
      // which will adopt the same ID instead of creating again.
      scenario = baseScenario({ headingCount: 0, formCount: 0, backend: "absent" })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await expect(ticketPurchaseEventStep(context, { environment: developmentEnvironment })).rejects.toThrow()
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("started")
      expect(ticket.eventId).toBeUndefined()
      expect(fills.filter((fill) => fill.selector === "#admin-event-key").map((fill) => fill.value)).toEqual([
        `ticket-e2e-${runId}`,
      ])
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("retains started on an admin alert without adopting a missing row", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-alert-"))
    try {
      scenario = baseScenario({ headingCount: 0, formCount: 0, alertCount: 1, backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await expect(ticketPurchaseEventStep(context, { environment: developmentEnvironment })).rejects.toThrow(
        "Admin reported an event creation error",
      )
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("started")
      expect(ticket.eventId).toBeUndefined()
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("adopts the existing own event without a duplicate", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-existing-"))
    try {
      scenario = baseScenario({ headingCount: 1, formCount: 1, backend: "own" })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseEventStep(context, { environment: developmentEnvironment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("completed")
      expect(ticket.eventId).toBe(`ticket-e2e-${runId}`)
      // No replacement created on top of the proven event.
      expect(fills).toEqual([])
      expect(gotoUrls.some((url) => url.endsWith("/admin/events/new"))).toBe(false)
      expect(gotoUrls.some((url) => url.includes(`/admin/events/${encodeURIComponent(`ticket-e2e-${runId}`)}`))).toBe(
        true,
      )
    } finally {
      await rm(directory, { recursive: true, force: true })
    }
  })

  it("does not adopt a foreign or mismatched payload after save", async () => {
    const cases: Array<{ name: string; after: BackendKind }> = [
      { name: "foreign-title", after: "foreign" },
      { name: "wrong-status", after: "wrong-status" },
      { name: "multiple", after: "multiple" },
      { name: "error", after: "error" },
      { name: "throws", after: "throws" },
    ]
    for (const entry of cases) {
      const directory = await mkdtemp(join(tmpdir(), `eventoren-ticket-event-post-${entry.name}-`))
      try {
        scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", entry.after] })
        resetState()
        const checkpoint = startedCheckpoint()
        expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
        const context = contextCreate(directory, checkpoint)
        await expect(ticketPurchaseEventStep(context, { environment: developmentEnvironment })).rejects.toThrow()
        const ticket = await storedTicket(directory)
        expect(ticket.step).toBe("event")
        expect(ticket.status).toBe("started")
        expect(ticket.eventId).toBeUndefined()
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })

  it("stays blocked without mutation for foreign, multiple, malformed, unauthorized, or unproven absence", async () => {
    const otherRunId = "xyz-12345678-1234-1234-1234-123456789abc"
    const cases: Array<{ name: string; scenario: EventScenario; ticket: Record<string, unknown> }> = [
      {
        // Same key with a foreign title must never be adopted or overwritten.
        name: "foreign",
        scenario: baseScenario({ headingCount: 0, formCount: 1, backend: "foreign" }),
        ticket: {},
      },
      {
        name: "wrong-status",
        scenario: baseScenario({ headingCount: 0, formCount: 1, backend: "wrong-status" }),
        ticket: {},
      },
      {
        name: "multiple",
        scenario: baseScenario({ headingCount: 2, formCount: 0, backend: "multiple" }),
        ticket: {},
      },
      {
        name: "malformed",
        scenario: baseScenario({ headingCount: 0, formCount: 0, backend: "absent" }),
        ticket: {
          eventKey: `ticket-e2e-${otherRunId}`,
          eventTitle: `Ticket E2E ${otherRunId}`,
          participantName: `E2E Participant ${otherRunId}`,
        },
      },
      {
        name: "unauthorized",
        scenario: baseScenario({ headingCount: 0, formCount: 0, signInFails: true, backend: "absent" }),
        ticket: {},
      },
      {
        // Zero UI counts with no authorized backend proof must not create.
        name: "loading-session-missing",
        scenario: baseScenario({ headingCount: 0, formCount: 0, sessionToken: null, backend: "absent" }),
        ticket: {},
      },
      {
        name: "loading-session-throws",
        scenario: baseScenario({ headingCount: 0, formCount: 0, sessionThrows: true, backend: "absent" }),
        ticket: {},
      },
      {
        name: "loading-backend-error",
        scenario: baseScenario({ headingCount: 0, formCount: 0, backend: "error" }),
        ticket: {},
      },
      {
        name: "loading-backend-throws",
        scenario: baseScenario({ headingCount: 0, formCount: 0, backend: "throws" }),
        ticket: {},
      },
    ]
    for (const entry of cases) {
      const directory = await mkdtemp(join(tmpdir(), `eventoren-ticket-event-${entry.name}-`))
      try {
        scenario = entry.scenario
        resetState()
        const checkpoint = startedCheckpoint(entry.ticket)
        expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
        const context = contextCreate(directory, checkpoint)
        await expect(ticketPurchaseEventStep(context, { environment: developmentEnvironment })).rejects.toThrow()
        const ticket = await storedTicket(directory)
        expect(ticket.step).toBe("event")
        expect(ticket.status).toBe("started")
        expect(ticket.eventId).toBeUndefined()
        expect(fills).toEqual([])
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })
})

describe("ticket event canonical backend binding", () => {
  it("queries the development canonical backend despite an ambient production VITE URL", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-canonical-"))
    try {
      // The default catalog client would resolve this ambient production URL
      // (or localhost) and miss the DEV run fixtures. The step must ignore it
      // and bind its explicit client to the invocation canonical DEV backend.
      const environment: Record<string, string | undefined> = {
        ...developmentEnvironment,
        VITE_CONVEX_URL: "https://convex.eventoren.de",
      }
      scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      await ticketPurchaseEventStep(context, { environment })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("completed")
      expect(ticket.eventId).toBe(`ticket-e2e-${runId}`)
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
      const directory = await mkdtemp(join(tmpdir(), `eventoren-ticket-event-${entry.name}-`))
      try {
        scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", "own"] })
        resetState()
        const checkpoint = startedCheckpoint()
        expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
        const context = contextCreate(directory, checkpoint)
        await expect(ticketPurchaseEventStep(context, { environment: entry.environment })).rejects.toThrow()
        const ticket = await storedTicket(directory)
        expect(ticket.step).toBe("event")
        expect(ticket.status).toBe("started")
        expect(ticket.eventId).toBeUndefined()
        expect(catalogCalls).toBe(0)
        expect(fills).toEqual([])
      } finally {
        await rm(directory, { recursive: true, force: true })
      }
    }
  })

  it("uses the explicitly passed mock client instead of an ambient default", async () => {
    const directory = await mkdtemp(join(tmpdir(), "eventoren-ticket-event-explicit-client-"))
    try {
      scenario = baseScenario({ headingCount: 0, formCount: 0, backendSequence: ["absent", "own"] })
      resetState()
      const checkpoint = startedCheckpoint()
      expect((await e2eCheckpointSave(directory, checkpoint as never)).success).toBe(true)
      const context = contextCreate(directory, checkpoint)
      const mockClient = { mockClient: true }
      await ticketPurchaseEventStep(context, {
        environment: developmentEnvironment,
        client: mockClient as never,
      })
      const ticket = await storedTicket(directory)
      expect(ticket.step).toBe("event")
      expect(ticket.status).toBe("completed")
      expect(ticket.eventId).toBe(`ticket-e2e-${runId}`)
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
