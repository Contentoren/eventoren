import { expect, test } from "bun:test"
import { adminMemberManagementInvitationFormat } from "../src/admin/adminMemberManagementInvitationFormat.ts"

test("member invitation timestamps always show Berlin summer and winter time", () => {
  expect(adminMemberManagementInvitationFormat("2026-06-24T16:00:00Z")).toBe("24.06.2026, 18:00")
  expect(adminMemberManagementInvitationFormat("2026-12-24T16:00:00Z")).toBe("24.12.2026, 17:00")
  expect(adminMemberManagementInvitationFormat("2026-06-24T22:30:00Z")).toBe("25.06.2026, 00:30")
  expect(adminMemberManagementInvitationFormat(undefined)).toBe("—")
  expect(adminMemberManagementInvitationFormat("invalid")).toBe("—")
})
