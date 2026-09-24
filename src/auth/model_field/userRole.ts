import * as a from "valibot"

export type UserRole = keyof typeof userRole

export const userRole = {
  user: "user",
  customer: "customer",
  organizer: "organizer",
  admin: "admin",
} as const

export const userRoleSchema = a.enum(userRole)

function types1(a: a.InferOutput<typeof userRoleSchema>): UserRole {
  return a
}

export function userRoleToCurrent(r: UserRole): Exclude<UserRole, "user"> {
  if (r === userRole.user) return userRole.customer
  return r
}

export function userRoleIsCustomer(r: UserRole): boolean {
  return r === userRole.user || r === userRole.customer
}

export function userRoleCanAccessOrganizer(r: UserRole): boolean {
  return r === userRole.organizer || r === userRole.admin
}
