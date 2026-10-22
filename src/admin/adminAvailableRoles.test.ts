import { expect, test } from "vitest"
import type { AdminZitadelMember } from "./AdminZitadelMember.ts"
import { adminAvailableRolesRead } from "./adminAvailableRoles.ts"

function memberWithRoles(zitadelRoles: AdminZitadelMember["zitadelRoles"]): AdminZitadelMember {
  return {
    displayName: "Member",
    organizerGranted: false,
    userName: "member",
    zitadelRoles,
    zitadelUserId: "user-id",
  }
}

test("offers the generic base roles admin and user when no other roles exist", () => {
  expect(adminAvailableRolesRead([])).toEqual(["admin", "user"])
})

test("keeps roles already present in the project alongside the base roles", () => {
  expect(
    adminAvailableRolesRead([memberWithRoles(["customer", "organizer"]), memberWithRoles(["admin", "organizer"])]),
  ).toEqual(["admin", "user", "customer", "organizer"])
})
