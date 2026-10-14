import { expect, test } from "bun:test"
import { jwtVerify } from "jose"
import { envAuthSecretResult } from "../src/app/env/private/envAuthSecretResult.ts"
import { eventorenSessionCookie } from "../src/auth/server/eventorenSessionCookie.ts"
import { createToken } from "../src/auth/server/jwt_token/createToken.ts"
import { createTokenResult } from "../src/auth/server/jwt_token/createTokenResult.ts"
import { verifyToken } from "../src/auth/server/jwt_token/verifyToken.ts"
import { verifyTokenResult } from "../src/auth/server/jwt_token/verifyTokenResult.ts"
import { zitadelRoleSyncProofCreate } from "../src/auth/server/zitadelRoleSyncProofCreate.ts"

const secret = "eventoren-secret-normalization-ä"

test("session JWTs, login cookies and Zitadel proofs use the same trimmed UTF-8 secret", async () => {
  await withSecret(` \t${secret}\r\n`, async () => {
    expect(envAuthSecretResult()).toMatchObject({ success: true, data: secret })
    const token = await createTokenResult("secret-test-user")
    expect(token.success).toBe(true)
    if (!token.success) return
    const verified = await jwtVerify(token.data, new TextEncoder().encode(secret), { algorithms: ["HS256"] })
    expect(verified.payload.sub).toBe("secret-test-user")

    const cookie = await eventorenSessionCookie.loginCreate("state", "verifier", "/admin", true)
    const provider = { provider: "zitadel" as const, providerId: "secret-test-user", username: "Secret test user" }
    const proof = await zitadelRoleSyncProofCreate(provider)
    expect(proof).toBeDefined()
    if (!proof) return
    expect(
      (await jwtVerify(proof, new TextEncoder().encode(secret), { algorithms: ["HS256"] })).payload.provider,
    ).toEqual(provider)

    process.env.AUTH_SECRET = secret
    expect((await verifyTokenResult(token.data)).success).toBe(true)
    expect(await eventorenSessionCookie.loginRead(cookie)).toMatchObject({ state: "state", returnTo: "/admin" })

    const directlySigned = await createToken("secret-test-user", `\n${secret} `)
    expect((await verifyToken(directlySigned, secret)).success).toBe(true)
    expect((await verifyToken(directlySigned, ` ${secret}\n`)).success).toBe(true)
  })
})

test.each([undefined, "", " \t\r\n", "replace-with-a-secret", " \nreplace-with-a-secret\t "])(
  "rejects missing, blank or placeholder AUTH_SECRET consistently: %j",
  async (value) => {
    await withSecret(value, async () => {
      expect(envAuthSecretResult()).toMatchObject({
        success: false,
        errorMessage: "env.AUTH_SECRET not set or defined",
      })
      expect((await createTokenResult("secret-test-user")).success).toBe(false)
      expect((await verifyTokenResult("invalid-token")).success).toBe(false)
      expect(await createToken("secret-test-user", value ?? "")).toBe("")
      expect((await verifyToken("invalid-token", value)).success).toBe(false)
      expect(
        await zitadelRoleSyncProofCreate({
          provider: "zitadel",
          providerId: "secret-test-user",
          username: "Secret test user",
        }),
      ).toBeUndefined()
      const cookie = await eventorenSessionCookie.loginCreate("state", "verifier", "/admin", true)
      expect(await eventorenSessionCookie.loginRead(cookie)).toBeUndefined()
    })
  },
)

test("the internal JWT verifier retains the jose signature failure for diagnostics", async () => {
  const token = await createToken("secret-test-user", secret)
  const result = await verifyToken(token, "different-application-secret")
  expect(result).toMatchObject({ success: false, op: "verifyToken", errorMessage: "signature verification failed" })
})

async function withSecret(value: string | undefined, callback: () => Promise<void>) {
  const previous = process.env.AUTH_SECRET
  if (value === undefined) delete process.env.AUTH_SECRET
  else process.env.AUTH_SECRET = value
  try {
    await callback()
  } finally {
    if (previous === undefined) delete process.env.AUTH_SECRET
    else process.env.AUTH_SECRET = previous
  }
}
