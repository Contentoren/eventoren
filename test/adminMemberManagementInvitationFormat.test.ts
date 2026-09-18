import { expect, test } from "bun:test"
import { adminMemberManagementInvitationFormat } from "../src/admin/adminMemberManagementInvitationFormat.ts"

test("formats valid invitation timestamps with German date and time conventions", () => {
  const timestamp = "2026-02-03T16:05:00.000Z"
  const date = new Date(timestamp)

  expect(adminMemberManagementInvitationFormat(timestamp)).toBe(
    new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(date),
  )
  expect(adminMemberManagementInvitationFormat(timestamp)).not.toBe(
    new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(date),
  )
})

test("uses a dash for missing or invalid invitation timestamps", () => {
  expect(adminMemberManagementInvitationFormat(undefined)).toBe("—")
  expect(adminMemberManagementInvitationFormat("not-a-date")).toBe("—")
})
