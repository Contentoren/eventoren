/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { SignJWT } from "jose"
import { expect, test } from "vitest"
import { verifyToken } from "../src/auth/server/jwt_token/verifyToken.ts"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-expiry-test-secret"
process.env.AUTH_SECRET = authSecret

test("rejects an expired JWT even while its persisted auth session remains active", async () => {
  const t = convexTest(schema, modules)
  const now = new Date().toISOString()
  const userId = await t.run((ctx) =>
    ctx.db.insert("users", {
      name: "JWT expiry regression",
      role: "customer",
      createdAt: now,
      updatedAt: now,
    }),
  )
  const expiredToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt(Math.floor(Date.now() / 1000) - 120)
    .setExpirationTime(Math.floor(Date.now() / 1000) - 60)
    .sign(new TextEncoder().encode(authSecret))
  await t.run((ctx) =>
    ctx.db.insert("authSessions", {
      userId,
      loginMethod: "email",
      token: expiredToken,
      expiresAt: "2999-01-01T00:00:00.000Z",
      createdAt: now,
      updatedAt: now,
    }),
  )

  const resolved = await t.query(api.auth.authCurrentUserGetQuery, { token: expiredToken })
  expect(resolved.success).toBe(false)
})

test("requires JWT expiration and only accepts the HS256 signing algorithm", async () => {
  const secret = new TextEncoder().encode(authSecret)
  const unsignedExpiryToken = await new SignJWT({})
    .setProtectedHeader({ alg: "HS256" })
    .setSubject("jwt-contract-regression")
    .setIssuedAt()
    .sign(secret)
  const hs512Token = await new SignJWT({})
    .setProtectedHeader({ alg: "HS512" })
    .setSubject("jwt-contract-regression")
    .setIssuedAt()
    .setExpirationTime("1h")
    .sign(secret)

  const noExpiry = await verifyToken(unsignedExpiryToken, authSecret)
  const wrongAlgorithm = await verifyToken(hs512Token, authSecret)
  expect(noExpiry.success).toBe(false)
  expect(wrongAlgorithm.success).toBe(false)
})
