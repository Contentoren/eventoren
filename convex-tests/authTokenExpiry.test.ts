/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { SignJWT } from "jose"
import { expect, test } from "vitest"
import { verifyToken } from "../src/auth/server/jwt_token/verifyToken.ts"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
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
  expect(resolved).toMatchObject({ success: false, errorMessage: "Anmeldung erforderlich" })
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

test("Convex rejects a mismatched signing secret with a safe sign-in error for current user and admin catalog", async () => {
  const t = convexTest(schema, modules)
  const token = await createToken("jwt-secret-mismatch", "different-secret")
  const currentUser = await t.query(api.auth.authCurrentUserGetQuery, { token })
  const adminEvents = await t.query(api.catalog.catalogEventListAdminPageQuery, {
    token,
    paginationOpts: { numItems: 50, cursor: null },
  })
  for (const result of [currentUser, adminEvents]) {
    expect(result).toMatchObject({ success: false, errorMessage: "Anmeldung erforderlich" })
    expect(JSON.stringify(result)).not.toContain("signature verification failed")
  }
})

test("Convex accepts an admin JWT signed with the trimmed secret even when its environment has whitespace", async () => {
  const previous = process.env.AUTH_SECRET
  process.env.AUTH_SECRET = ` \t${authSecret}\r\n`
  try {
    const t = convexTest(schema, modules)
    const now = new Date().toISOString()
    const userId = await t.run((ctx) =>
      ctx.db.insert("users", {
        name: "Normalized secret admin",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      }),
    )
    const token = await createToken(userId, authSecret)
    await t.run((ctx) =>
      ctx.db.insert("authSessions", {
        userId,
        loginMethod: "dev",
        token,
        expiresAt: "2999-01-01T00:00:00.000Z",
        createdAt: now,
        updatedAt: now,
      }),
    )
    const result = await t.query(api.catalog.catalogEventListAdminPageQuery, {
      token,
      paginationOpts: { numItems: 50, cursor: null },
    })
    expect(result.success).toBe(true)
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = previous
  }
})
