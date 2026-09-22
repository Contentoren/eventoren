import { expect, test } from "bun:test"
import { eventorenAuthIdentityCreate } from "../src/auth/model/eventorenAuthIdentityCreate.ts"

test("creates an allowlisted identity without session credentials", () => {
  const identity = eventorenAuthIdentityCreate({
    userId: "user-1",
    name: "Ada",
    email: "ada@example.test",
    role: "admin",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    token: "must-not-cross-the-identity-boundary",
  } as never)

  expect(identity).toEqual({ userId: "user-1", name: "Ada", email: "ada@example.test", role: "admin" })
  expect(identity).not.toHaveProperty("token")
})
