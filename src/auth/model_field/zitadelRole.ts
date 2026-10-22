import * as a from "valibot"

export const zitadelRole = {
  customer: "customer",
  organizer: "organizer",
  admin: "admin",
  user: "user",
} as const

export type ZitadelRole = keyof typeof zitadelRole

export const zitadelRoleSchema = a.enum(zitadelRole)
