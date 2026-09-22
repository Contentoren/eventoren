import { expect, test } from "bun:test"
import { createResult, createResultError } from "#result"
import type { AdminZitadelMember } from "../src/admin/AdminZitadelMember.ts"
import { adminMemberManagementStateCreate } from "../src/admin/adminMemberManagementStateCreate.ts"
import { adminOrganizerMembersPageStateCreate } from "../src/admin/adminOrganizerMembersPageStateCreate.ts"

test("loads the member directory through the server session when the browser token is unavailable", async () => {
  const member = memberCreate("member-1", false)
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

test("changes member roles through the injected server action without a browser token", async () => {
  const member = memberCreate("member-1", false)
  const operations: { operation: "grant" | "revoke"; zitadelUserId: string }[] = []
  const state = adminMemberManagementStateCreate({
    list: async () => createResult({ members: [member], total: 1 }),
    roleChange: async (input) => {
      operations.push(input)
      const organizerGranted = input.operation === "grant"
      return createResult({
        organizerGranted,
        operation: input.operation,
        zitadelRoles: organizerGranted ? ["organizer"] : ["customer"],
        zitadelUserId: input.zitadelUserId,
      })
    },
  })

  await state.reload()
  await state.roleChange(member)
  await state.roleChange({ ...member, organizerGranted: true })

  expect(operations).toEqual([
    { operation: "grant", zitadelUserId: "member-1" },
    { operation: "revoke", zitadelUserId: "member-1" },
  ])
  expect(state.members()[0]?.organizerGranted).toBe(false)
})

test("tracks initial loading and preserves member directory state on refresh", async () => {
  const initialMember = memberCreate("member-1", false)
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

function memberCreate(zitadelUserId: string, organizerGranted: boolean): AdminZitadelMember {
  return {
    displayName: zitadelUserId,
    organizerGranted,
    userName: zitadelUserId,
    zitadelRoles: organizerGranted ? ["organizer"] : ["customer"],
    zitadelUserId,
  }
}
