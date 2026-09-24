import { expect, test } from "bun:test"
import * as a from "valibot"
import {
  userRole,
  userRoleCanAccessOrganizer,
  userRoleIsCustomer,
  userRoleSchema,
  userRoleToCurrent,
} from "../src/auth/model_field/userRole.ts"
import { userRoleIsAdmin } from "../src/auth/model_field/userRoleIsAdmin.ts"

test("maps the legacy user role to customer without changing stored compatibility", () => {
  expect(userRoleToCurrent(userRole.user)).toBe(userRole.customer)
  expect(userRoleIsCustomer(userRole.user)).toBe(true)
})

test("admin access requires admin and organizer access includes admins and organizers", () => {
  expect(userRoleIsAdmin(userRole.admin)).toBe(true)
  expect(userRoleIsAdmin(userRole.organizer)).toBe(false)
  expect(userRoleIsAdmin(userRole.customer)).toBe(false)
  expect(userRoleCanAccessOrganizer(userRole.organizer)).toBe(true)
  expect(userRoleCanAccessOrganizer(userRole.admin)).toBe(true)
  expect(userRoleCanAccessOrganizer(userRole.customer)).toBe(false)
})

test("the active user-role schema rejects the historical dev role", () => {
  expect(a.safeParse(userRoleSchema, "dev").success).toBe(false)
})
