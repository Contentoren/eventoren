/// <reference types="vite/client" />

import { convexTest } from "convex-test"
import { expect, test } from "vitest"
import { api } from "../convex/_generated/api.js"
import schema from "../convex/schema.js"

const modules = import.meta.glob("../convex/**/*.ts")
const authSecret = "eventoren-auth-convex-test-secret"
process.env.AUTH_SECRET = authSecret

test("maps Zitadel identity to an Eventoren session and revokes it on logout", async () => {
  const t = convexTest(schema, modules)
  const signedIn = await t.action(api.auth.authSignInUsingZitadelAction, {
    provider: "zitadel",
    providerId: "testadmin-zitadel-subject",
    givenName: "Test",
    familyName: "Admin",
    image: "",
    username: "testadmin",
    email: "testadmin@contentoren.de",
  })

  expect(signedIn.success).toBe(true)
  if (!signedIn.success) return
  expect(signedIn.data.signedInMethod).toBe("zitadel")
  expect(signedIn.data.profile.role).toBe("user")

  const currentUser = await t.query(api.auth.authCurrentUserGetQuery, { token: signedIn.data.token })
  expect(currentUser).toMatchObject({ success: true, data: { email: "testadmin@contentoren.de", role: "user" } })

  const revoked = await t.mutation(api.auth.authSessionRevokeMutation, { token: signedIn.data.token })
  expect(revoked).toBe(true)

  const afterLogout = await t.query(api.auth.authCurrentUserGetQuery, { token: signedIn.data.token })
  expect(afterLogout.success).toBe(false)
})
