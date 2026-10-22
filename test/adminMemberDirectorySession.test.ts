import { expect, mock, spyOn, test } from "bun:test"
import * as solid from "solid-js"
import { createResult, createResultError } from "#result"
import type { AdminZitadelMember } from "../src/admin/AdminZitadelMember.ts"
import { adminMemberManagementStateCreate } from "../src/admin/adminMemberManagementStateCreate.ts"
import { adminOrganizerMembersPageStateCreate } from "../src/admin/adminOrganizerMembersPageStateCreate.ts"
import { demoAdminMemberManagementStateCreate } from "../src/demo/state/demoAdminMemberManagementStateCreate.ts"

test("shows members with any role for all and honors each role filter", async () => {
  const admin = memberCreate("admin-1", false, ["admin"])
  const organizer = memberCreate("organizer-1", true)
  const customer = memberCreate("customer-1", false)
  const user = memberCreate("user-1", false, ["user"])
  const empty = memberCreate("empty-1", false, [])
  const state = adminMemberManagementStateCreate({
    list: async () => createResult({ members: [admin, organizer, customer, user, empty], total: 5 }),
  })

  await state.reload()

  expect(state.members()).toEqual([admin, organizer, customer, user])
  state.roleFilter.set("admin")
  expect(state.members()).toEqual([admin])
  state.roleFilter.set("organizer")
  expect(state.members()).toEqual([organizer])
  state.roleFilter.set("user")
  expect(state.members()).toEqual([user])
})

test("initializes the role filter to all and search to empty before hydration despite URL parameters", () => {
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      location: { href: "https://eventoren.test/admin/mitglieder?memberRole=organizer&memberSearch=testadmin" },
    },
  })

  try {
    solid.createRoot((dispose) => {
      try {
        const state = adminMemberManagementStateCreate()
        expect(state.roleFilter.get()).toBe("all")
        expect(state.search()).toBe("")
      } finally {
        dispose()
      }
    })
  } finally {
    if (previousWindow) Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
    else Reflect.deleteProperty(globalThis, "window")
  }
})

test.each(["admin", "organizer", "customer", "user"] as const)(
  "restores the %s URL role filter and search on mount before loading without rewriting history",
  async (role) => {
    const previousWindow = globalThis.window
    const href = `https://eventoren.test/admin/mitglieder?memberRole=${role}&memberSearch=testadmin`
    const replaceState = mock(() => {})
    const target = memberCreate(`${role}-1`, role === "organizer", [role])
    let mount: (() => void) | undefined
    // Bun uses Solid's server runtime; capture the mount callback to run it explicitly.
    const mountSpy = spyOn(solid, "onMount").mockImplementation((callback) => {
      mount = callback
    })
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { href }, history: { replaceState } },
    })
    let state!: ReturnType<typeof adminMemberManagementStateCreate>
    let dispose = () => {}
    const list = mock(async (input: { readonly search?: string }) => {
      expect(state.roleFilter.get()).toBe(role)
      expect(state.search()).toBe("testadmin")
      expect(input).toEqual({ search: "testadmin" })
      return createResult({ members: [target], total: 1 })
    })

    try {
      solid.createRoot((rootDispose) => {
        dispose = rootDispose
        state = adminMemberManagementStateCreate({ list })
      })
      expect(state.roleFilter.get()).toBe("all")
      expect(state.search()).toBe("")
      expect(list).not.toHaveBeenCalled()
      expect(mount).toBeDefined()

      mount?.()
      expect(state.roleFilter.get()).toBe(role)
      expect(state.search()).toBe("testadmin")
      expect(list).toHaveBeenCalledTimes(1)
      await Promise.resolve()

      expect(state.hasLoaded()).toBe(true)
      expect(state.members()).toEqual([target])
      expect(replaceState).not.toHaveBeenCalled()
      expect(globalThis.window.location.href).toBe(href)
    } finally {
      dispose()
      mountSpy.mockRestore()
      if (previousWindow) Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
      else Reflect.deleteProperty(globalThis, "window")
    }
  },
)

test("demo all filter shows every member carrying at least one role", () => {
  const state = demoAdminMemberManagementStateCreate()

  expect(state.members().map((member) => member.zitadelUserId)).toEqual([
    "demo-zitadel-mara",
    "demo-zitadel-jonas",
    "demo-zitadel-support",
  ])
})

test("loads the member directory through the server session when the browser token is unavailable", async () => {
  const member = memberCreate("member-1", false, ["admin"])
  let called = false
  const state = adminMemberManagementStateCreate({
    list: async () => {
      called = true
      return createResult({ members: [member], total: 1 })
    },
  })

  await state.reload()

  expect(called).toBe(true)
  expect(state.members()).toEqual([member])
  expect(state.total()).toBe(1)
})

test("edits member roles through the injected set-roles action without a browser token", async () => {
  const member = memberCreate("member-1", false, ["admin"])
  const calls: { readonly roles: readonly string[]; readonly zitadelUserId: string }[] = []
  const state = adminMemberManagementStateCreate({
    list: async () => createResult({ members: [member], total: 1 }),
    setRoles: async (input) => {
      calls.push(input)
      const organizerGranted = input.roles.includes("organizer")
      return createResult({
        eventorenUserId: "eventoren-member-1",
        organizerGranted,
        organizerInvitedAt: organizerGranted ? "2026-10-22T00:00:00.000Z" : undefined,
        roles: [...input.roles] as ("admin" | "organizer")[],
        zitadelUserId: input.zitadelUserId,
      })
    },
  })

  await state.reload()
  state.openEdit(member)

  expect(state.editingMember()).toEqual(member)
  expect(state.draftRoles.get()).toEqual(["admin"])

  state.draftRoles.set(["admin", "organizer"])
  await state.saveRoles()

  expect(calls).toEqual([{ roles: ["admin", "organizer"], zitadelUserId: "member-1" }])
  expect(state.members()[0]?.zitadelRoles).toEqual(["admin", "organizer"])
  expect(state.members()[0]?.organizerGranted).toBe(true)
  expect(state.editingMember()).toBeUndefined()
  expect(state.successMessage()).toBe(state.text().saved)
})

test("tracks initial loading and preserves member directory state on refresh", async () => {
  const initialMember = memberCreate("member-1", true)
  const updatedMember = memberCreate("member-2", true)
  let callCount = 0

  const state = adminMemberManagementStateCreate({
    list: async () => {
      callCount += 1
      if (callCount === 1) return createResult({ members: [initialMember], total: 1 })
      return createResult({ members: [initialMember, updatedMember], total: 2 })
    },
  })

  expect(state.isLoading()).toBe(true)
  expect(state.hasLoaded()).toBe(false)
  expect(state.members()).toEqual([])
  expect(state.total()).toBe(0)

  await state.reload()

  expect(state.isLoading()).toBe(false)
  expect(state.hasLoaded()).toBe(true)
  expect(state.members()).toEqual([initialMember])
  expect(state.total()).toBe(1)

  const reloadPromise = state.reload()
  expect(state.isLoading()).toBe(true)
  expect(state.hasLoaded()).toBe(true)
  expect(state.members()).toEqual([initialMember])
  expect(state.total()).toBe(1)

  await reloadPromise
  expect(state.isLoading()).toBe(false)
  expect(state.hasLoaded()).toBe(true)
  expect(state.members()).toEqual([initialMember, updatedMember])
  expect(state.total()).toBe(2)
})

test("keeps hasLoaded false when initial member directory request fails", async () => {
  const state = adminMemberManagementStateCreate({
    list: async () => createResultError("adminZitadelMembersList", "Netzwerkfehler"),
  })

  expect(state.isLoading()).toBe(true)
  expect(state.hasLoaded()).toBe(false)

  await state.reload()

  expect(state.isLoading()).toBe(false)
  expect(state.hasLoaded()).toBe(false)
  expect(state.errorMessage()).toBe(state.text().loadError)
  expect(state.members()).toEqual([])
  expect(state.total()).toBe(0)
})

test("loads organizers through the server session when the browser token is unavailable", async () => {
  const member = memberCreate("organizer-1", true)
  let called = false
  const state = adminOrganizerMembersPageStateCreate({
    list: async () => {
      called = true
      return createResult({ members: [member], total: 1 })
    },
  })

  await state.reload()

  expect(called).toBe(true)
  expect(state.members()).toEqual([member])
})

test("tracks initial loading and preserves organizer state on refresh", async () => {
  const initialOrganizer = memberCreate("organizer-1", true)
  const secondOrganizer = memberCreate("organizer-2", true)
  let callCount = 0

  const state = adminOrganizerMembersPageStateCreate({
    list: async () => {
      callCount += 1
      if (callCount === 1) return createResult({ members: [initialOrganizer], total: 1 })
      return createResult({ members: [initialOrganizer, secondOrganizer], total: 2 })
    },
  })

  expect(state.isLoading()).toBe(true)
  expect(state.hasLoaded()).toBe(false)
  expect(state.members()).toEqual([])

  await state.reload()

  expect(state.isLoading()).toBe(false)
  expect(state.hasLoaded()).toBe(true)
  expect(state.members()).toEqual([initialOrganizer])

  const reloadPromise = state.reload()
  expect(state.isLoading()).toBe(true)
  expect(state.hasLoaded()).toBe(true)
  expect(state.members()).toEqual([initialOrganizer])

  await reloadPromise
  expect(state.isLoading()).toBe(false)
  expect(state.hasLoaded()).toBe(true)
  expect(state.members()).toEqual([initialOrganizer, secondOrganizer])
})

test("keeps hasLoaded false when initial organizer request fails", async () => {
  const state = adminOrganizerMembersPageStateCreate({
    list: async () => createResultError("adminZitadelOrganizerMembersList", "Fehler"),
  })

  expect(state.isLoading()).toBe(true)
  expect(state.hasLoaded()).toBe(false)

  await state.reload()

  expect(state.isLoading()).toBe(false)
  expect(state.hasLoaded()).toBe(false)
  expect(state.errorMessage()).toBe("Fehler")
  expect(state.members()).toEqual([])
})

function memberCreate(
  zitadelUserId: string,
  organizerGranted: boolean,
  zitadelRoles: AdminZitadelMember["zitadelRoles"] = organizerGranted ? ["organizer"] : ["customer"],
): AdminZitadelMember {
  return {
    displayName: zitadelUserId,
    organizerGranted,
    userName: zitadelUserId,
    zitadelRoles,
    zitadelUserId,
  }
}
