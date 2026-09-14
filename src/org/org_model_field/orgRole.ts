export type OrgRole = keyof typeof orgRole

import * as a from "valibot"

export const orgRole = {
  member: "member",
  guest: "guest",
} as const

export const orgRoleSchema = a.enum(orgRole)
