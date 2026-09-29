import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import type { AdminZitadelMember } from "../src/admin/AdminZitadelMember.ts"
import { adminZitadelMembersListAll } from "../src/admin/adminZitadelMembersListAll.ts"

test("loads every matching member page and carries search through pagination", async () => {
  const calls: { readonly offset: number; readonly limit: number; readonly search?: string; readonly token: string }[] =
    []
  const members = Array.from({ length: 125 }, (_, index) => memberCreate(`member-${index + 1}`))
  const client = {
    action: async (_reference: unknown, input: { limit: number; offset: number; search?: string; token: string }) => {
      calls.push(input)
      return {
        success: true as const,
        data: { members: members.slice(input.offset, input.offset + input.limit), total: members.length },
      }
    },
  } as unknown as ConvexHttpClient

  const result = await adminZitadelMembersListAll({ search: "organizer", token: "admin-token" }, client)

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(calls).toEqual([
    { limit: 100, offset: 0, search: "organizer", token: "admin-token" },
    { limit: 100, offset: 100, search: "organizer", token: "admin-token" },
  ])
  expect(result.data.members).toEqual(members)
  expect(result.data.members.filter((member) => member.organizerGranted)).toHaveLength(75)
  expect(result.data.members.at(-1)?.zitadelUserId).toBe("member-125")
  expect(result.data.total).toBe(125)
})

test("stops pagination when the directory returns an empty page", async () => {
  const offsets: number[] = []
  const client = {
    action: async (_reference: unknown, input: { offset: number }) => {
      offsets.push(input.offset)
      return {
        success: true as const,
        data: { members: input.offset === 0 ? [memberCreate("member-1")] : [], total: 3 },
      }
    },
  } as unknown as ConvexHttpClient

  const result = await adminZitadelMembersListAll({ token: "admin-token" }, client)

  expect(offsets).toEqual([0, 1])
  expect(result.success).toBe(true)
  if (!result.success) return
  expect(result.data.members.map((member) => member.zitadelUserId)).toEqual(["member-1"])
})

function memberCreate(zitadelUserId: string): AdminZitadelMember {
  const organizerGranted = Number(zitadelUserId.slice("member-".length)) > 50
  return {
    displayName: zitadelUserId,
    organizerGranted,
    userName: zitadelUserId,
    zitadelRoles: organizerGranted ? ["organizer"] : ["customer"],
    zitadelUserId,
  }
}
