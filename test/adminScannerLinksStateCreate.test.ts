import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { AdminEventItem } from "../src/admin/AdminEventItem.ts"
import { adminScannerLinksStateCreate } from "../src/admin/adminScannerLinksStateCreate.ts"
import type { scannerLinkAdminServerCreate } from "../src/admin/scannerLinkAdminServerCreate.ts"

const event = (id: string, status: AdminEventItem["status"] = "published") =>
  ({ id, title: id, status }) as AdminEventItem
const link = (id: string, role: "organizer" | "helper", extra = {}) =>
  ({
    _id: id as Id<"scannerLinks">,
    role,
    name: id,
    code: `secret-${id}`,
    eventKeys: ["one"],
    expiresAt: Date.now() + 86400000,
    createdAt: Date.now(),
    _creationTime: Date.now(),
    ...extra,
  }) as Doc<"scannerLinks">
const page = (items: Doc<"scannerLinks">[]) => ({
  success: true as const,
  data: { page: items, continueCursor: "end", isDone: true },
})

test("admin link forms reject unpublished events, foreign helper events and expiry beyond parent before calling server", async () => {
  const calls: unknown[] = []
  const parent = link("parent", "organizer")
  const source = {
    organizerList: async () => page([parent]),
    helperList: async () => page([]),
    organizerCreate: async (input: unknown) => {
      calls.push(input)
      return { success: true, data: { id: parent._id, code: parent.code } }
    },
    helperCreate: async (input: unknown) => {
      calls.push(input)
      return { success: true, data: { id: parent._id, code: "secret" } }
    },
  } as unknown as ReturnType<typeof scannerLinkAdminServerCreate>
  let state!: ReturnType<typeof adminScannerLinksStateCreate>
  const dispose = createRoot((done) => {
    state = adminScannerLinksStateCreate(
      () => ({ success: true, data: [event("one"), event("two"), event("draft", "draft")] }),
      source,
    )
    return done
  })
  try {
    await state.loadOrganizers()
    state.organizerName.set("Venue")
    state.organizerEvents.set(["draft"])
    state.organizerExpiry.set(new Date(Date.now() + 3600000).toISOString())
    await state.createOrganizer()
    expect(calls).toHaveLength(0)
    state.organizerEvents.set(["one", "two"])
    await state.createOrganizer()
    expect(calls).toHaveLength(1)
    expect(state.organizerName.get()).toBe("")
    state.selectParent(parent._id)
    state.helperName.set("Crew")
    state.helperEvents.set(["two"])
    state.helperExpiry.set(new Date(Date.now() + 3600000).toISOString())
    await state.createHelper()
    expect(calls).toHaveLength(1)
    state.helperEvents.set(["one"])
    state.helperExpiry.set(new Date(parent.expiresAt + 60000).toISOString())
    await state.createHelper()
    expect(calls).toHaveLength(1)
    state.helperExpiry.set(new Date(Date.now() + 3600000).toISOString())
    await state.createHelper()
    expect(calls).toHaveLength(2)
    expect(calls[1]).toMatchObject({ data: { parentId: parent._id, name: "Crew", eventKeys: ["one"] } })
  } finally {
    dispose()
  }
})

test("admin listing paginates helpers under the selected organizer and revokes by role", async () => {
  const calls: string[] = []
  const parent = link("parent", "organizer")
  const helper = link("helper", "helper", { parentId: parent._id })
  const source = {
    organizerList: async () => page([parent]),
    helperList: async ({ data }: { data: { parentId: string } }) => {
      calls.push(`list:${data.parentId}`)
      return page([helper])
    },
    organizerRevoke: async () => {
      calls.push("revoke:organizer")
      return { success: true, data: { id: parent._id } }
    },
    helperRevoke: async () => {
      calls.push("revoke:helper")
      return { success: true, data: { id: helper._id } }
    },
  } as unknown as ReturnType<typeof scannerLinkAdminServerCreate>
  let state!: ReturnType<typeof adminScannerLinksStateCreate>
  const dispose = createRoot((done) => {
    state = adminScannerLinksStateCreate(() => ({ success: true, data: [event("one")] }), source)
    return done
  })
  try {
    await state.loadOrganizers()
    state.selectParent(parent._id)
    await new Promise((resolve) => setTimeout(resolve, 0))
    expect(state.helpers()).toHaveLength(1)
    expect(calls).toContain("list:parent")
    await state.revoke(helper)
    await state.revoke(parent)
    expect(calls).toContain("revoke:helper")
    expect(calls).toContain("revoke:organizer")
    expect(state.helpers()[0]?.revokedAt).toBeNumber()
    expect(state.organizers()[0]?.revokedAt).toBeNumber()
  } finally {
    dispose()
  }
})

test("admin organizer creation keeps the form and displays a backend failure returned by the server", async () => {
  const source = {
    organizerCreate: async () => ({
      success: false,
      op: "scannerLinkAdminCreate",
      errorMessage: "Scannerlink-Funktionen fehlen im Backend. Bitte Backend aktualisieren.",
    }),
  } as unknown as ReturnType<typeof scannerLinkAdminServerCreate>
  let state!: ReturnType<typeof adminScannerLinksStateCreate>
  const dispose = createRoot((done) => {
    state = adminScannerLinksStateCreate(
      () => ({ success: true, data: [event("fiktiv-uiux-testabend-2026-11-14")] }),
      source,
    )
    return done
  })
  try {
    state.organizerName.set("Test organizer")
    state.organizerEvents.set(["fiktiv-uiux-testabend-2026-11-14"])
    state.organizerExpiry.set(new Date(Date.now() + 3600000).toISOString())
    await state.createOrganizer()
    expect(state.error()).toContain("fehlen im Backend")
    expect(state.organizerName.get()).toBe("Test organizer")
    expect(state.organizerEvents.get()).toEqual(["fiktiv-uiux-testabend-2026-11-14"])
    expect(state.pending()).toBe(false)
  } finally {
    dispose()
  }
})
