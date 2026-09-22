import { expect, test } from "bun:test"
import type { ConvexHttpClient } from "convex/browser"
import type { AdminZitadelMember } from "../src/admin/AdminZitadelMember.ts"
import { adminZitadelOrganizerMembersList } from "../src/admin/adminZitadelOrganizerMembersList.ts"

test("loads the complete member directory and keeps only active organizers", async () => {
  const offsets: number[] = []
  const members = [
    memberCreate("organizer-1", true),
    memberCreate("customer", false),
    memberCreate("organizer-2", true),
  ]
  const client = {
    action: async (_reference: unknown, input: { limit: number; offset: number }) => {
      offsets.push(input.offset)
      const page = input.offset === 0 ? members.slice(0, 2) : members.slice(2)
      return { success: true as const, data: { members: page, total: members.length } }
    },
  } as unknown as ConvexHttpClient

  const result = await adminZitadelOrganizerMembersList({ token: "admin-token" }, client)

  expect(result.success).toBe(true)
  if (!result.success) return
  expect(offsets).toEqual([0, 2])
  expect(result.data.members.map((member) => member.zitadelUserId)).toEqual(["organizer-1", "organizer-2"])
  expect(result.data.total).toBe(2)
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
