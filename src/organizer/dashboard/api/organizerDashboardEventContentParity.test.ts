import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import { getFunctionName } from "convex/server"
import { createResult } from "#result"
import { organizerDashboardCliRun } from "#src/cli/organizerDashboardCliRun.ts"
import { organizerDashboardClientCreate } from "#src/client/organizerDashboardClientCreate.ts"
import { organizerDashboardConvexBackendCreate } from "./organizerDashboardConvexBackendCreate.ts"
import { organizerDashboardHonoCreate } from "./organizerDashboardHonoCreate.ts"
import { organizerDashboardRequestMaxBytes } from "./organizerDashboardRequestMaxBytes.ts"

const credential = "content-parity-credential-837d"
const orgId = "org_test"
const eventKey = "event-test"
const eventCreate = {
  orgId,
  title: "Programm",
  subtitle: "",
  description: "",
  category: "Konzert",
  startsAt: "2026-10-24T18:00:00.000Z",
  endsAt: "2026-10-25T03:00:00.000Z",
  doorsAt: "2026-10-24T17:00:00.000Z",
  venue: "Saal",
  city: "Berlin",
  address: "",
  organizer: "",
  imageUrl: "",
  imageAlt: "",
}
const content = {
  faqs: [{ id: "faq_one", question: " Einlass? ", answer: " Ab 19 Uhr. " }],
  schedule: [
    { id: "opening", time: "23:30", title: " Beginn ", detail: "Nachtprogramm" },
    { id: "closing", time: "02:30", title: "Ende" },
  ],
}
const normalizedContent = {
  faqs: [{ id: "faq_one", question: "Einlass?", answer: "Ab 19 Uhr." }],
  schedule: [
    { id: "opening", time: "23:30", title: "Beginn", detail: "Nachtprogramm" },
    { id: "closing", time: "02:30", title: "Ende" },
  ],
}

function sdkCreate() {
  const calls: unknown[] = []
  const client = {
    mutation: async (reference: Parameters<typeof getFunctionName>[0], args: unknown) => {
      calls.push({ name: getFunctionName(reference), args })
      return createResult({ eventKey })
    },
  } as unknown as ConvexHttpClient
  return { client, calls, backend: organizerDashboardConvexBackendCreate(client) }
}

async function surfacesCall(operation: "event-create" | "event-update", args: object) {
  const sdk = sdkCreate()
  const http = await organizerDashboardHonoCreate(sdk.backend).request("/api/veranstalter", {
    method: "POST",
    headers: { authorization: "Bearer " + credential, "content-type": "application/json" },
    body: JSON.stringify({ operation, ...args }),
  })
  const output: string[] = []
  const exitCode = await organizerDashboardCliRun({
    argv: [operation, "--url", "https://convex.example.org", "--token-env", "CONTENT_TEST_CRED"],
    env: { CONTENT_TEST_CRED: credential },
    stdinText: JSON.stringify(args),
    stdout: (text) => output.push(text),
    backendFromUrl: () => sdk.backend,
  })
  const client = organizerDashboardClientCreate({ client: sdk.client, token: credential })
  const result =
    operation === "event-create" ? await client.eventCreate(args as never) : await client.eventUpdate(args as never)
  return { http, exitCode, cli: JSON.parse(output.join("")) as unknown, result, calls: sdk.calls }
}

for (const operation of ["event-create", "event-update"] as const) {
  const base = operation === "event-create" ? eventCreate : { orgId, eventKey, title: "Programm" }
  const fn =
    operation === "event-create" ? "organizerDashboardEventCreateMutation" : "organizerDashboardEventUpdateMutation"
  for (const entry of [
    { label: "ordered arrays preserve IDs and Berlin wall times", input: content, expected: normalizedContent },
    { label: "omission preserves absent fields", input: {}, expected: {} },
    {
      label: "empty arrays explicitly clear both fields",
      input: { faqs: [], schedule: [] },
      expected: { faqs: [], schedule: [] },
    },
    { label: "FAQ-only clearing leaves schedule omitted", input: { faqs: [] }, expected: { faqs: [] } },
    { label: "schedule-only clearing leaves FAQs omitted", input: { schedule: [] }, expected: { schedule: [] } },
  ]) {
    test(operation + " HTTP/CLI/client " + entry.label, async () => {
      const result = await surfacesCall(operation, { ...base, ...entry.input })
      expect(result.http.status).toBe(200)
      expect(await result.http.json()).toEqual({ data: { eventKey } })
      expect(result.exitCode).toBe(0)
      expect(result.cli).toEqual({ success: true, data: { eventKey } })
      expect(result.result as unknown).toEqual({ success: true, data: { eventKey } })
      expect(result.calls).toEqual(
        Array(3).fill({
          name: "organizerDashboardEvents:" + fn,
          args: { token: credential, ...base, ...entry.expected },
        }),
      )
    })
  }

  for (const [index, invalid] of [
    { faqs: null },
    { schedule: null },
    {
      faqs: [
        { id: "one", question: "?", answer: "yes" },
        { id: "one", question: "?", answer: "no" },
      ],
    },
    { faqs: [{ id: "one", question: "", answer: "yes" }] },
    { faqs: Array.from({ length: 21 }, (_, i) => ({ id: "faq_" + i, question: "?", answer: "yes" })) },
    { schedule: [{ id: "one", time: "24:00", title: "Ende" }] },
    { schedule: [{ id: "one", time: "2026-10-25T02:30:00.000Z", title: "Ende" }] },
    { schedule: Array.from({ length: 51 }, (_, i) => ({ id: "slot_" + i, time: "02:30", title: "Ende" })) },
  ].entries()) {
    test(operation + " invalid shared content " + index + " is rejected locally by HTTP/CLI/client", async () => {
      const result = await surfacesCall(operation, { ...base, ...invalid })
      expect(result.http.status).toBe(400)
      expect(result.exitCode).toBe(2)
      expect(result.result).toMatchObject({ success: false, error: { status: 400 } })
      expect(result.calls).toEqual([])
    })
  }

  for (const character of ["界", "\u0001"]) {
    test(
      operation +
        " maximum-count maximum-length " +
        (character === "界" ? "UTF-8" : "JSON-escaped") +
        " content fits the shared 512 KiB transport bound",
      async () => {
        const maxContent = {
          faqs: Array.from({ length: 20 }, (_, index) => ({
            id: "f".repeat(62) + String(index).padStart(2, "0"),
            question: character.repeat(200),
            answer: character.repeat(1000),
          })),
          schedule: Array.from({ length: 50 }, (_, index) => ({
            id: "s".repeat(62) + String(index).padStart(2, "0"),
            time: "02:30",
            title: character.repeat(200),
            detail: character.repeat(1000),
          })),
        }
        const args = { ...base, ...maxContent }
        const byteLength = new TextEncoder().encode(JSON.stringify({ operation, ...args })).byteLength
        expect(byteLength).toBeGreaterThan(32768)
        expect(byteLength).toBeLessThan(organizerDashboardRequestMaxBytes)
        const result = await surfacesCall(operation, args)
        expect(result.http.status).toBe(200)
        expect(result.exitCode).toBe(0)
        expect(result.result.success).toBe(true)
        expect(result.calls).toEqual(
          Array(3).fill({ name: "organizerDashboardEvents:" + fn, args: { token: credential, ...args } }),
        )
      },
    )
  }
}
