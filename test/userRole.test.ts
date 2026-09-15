import { expect, test } from "bun:test"
import {
  userRole,
  userRoleCanAccessOrganizer,
  userRoleIsCustomer,
  userRoleIsDevOrAdmin,
  userRoleToCurrent,
} from "../src/auth/model_field/userRole.ts"

test("maps the legacy user role to customer without changing stored compatibility", () => {
  expect(userRoleToCurrent(userRole.user)).toBe(userRole.customer)
  expect(userRoleIsCustomer(userRole.user)).toBe(true)
})

test("keeps existing admin and dev access and grants organizer access", () => {
  expect(userRoleIsDevOrAdmin(userRole.admin)).toBe(true)
  expect(userRoleIsDevOrAdmin(userRole.dev)).toBe(true)
  expect(userRoleCanAccessOrganizer(userRole.organizer)).toBe(true)
})
