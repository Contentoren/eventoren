import { expect, test } from "bun:test"
import { exportJWK, generateKeyPair, SignJWT } from "jose"
import { zitadelIdTokenVerify } from "../src/auth/server/zitadelIdTokenVerify.ts"

test("accepts a signed Zitadel ID token only when issuer, audience, expiry, and nonce validate", async () => {
  const issuer = "https://zitadel.example.test"
  const clientId = "eventoren-client"
  const nonce = "login-nonce"
  const { privateKey, publicKey } = await generateKeyPair("RS256")
  const jwk = await exportJWK(publicKey)
  const keyId = "test-signing-key"
  const previousFetch = globalThis.fetch
  globalThis.fetch = Object.assign(
    async () => Response.json({ keys: [{ ...jwk, kid: keyId, alg: "RS256", use: "sig" }] }),
    { preconnect: previousFetch.preconnect },
  )

  try {
    const tokenCreate = (claims: { issuer?: string; audience?: string; nonce?: string; expiresAt?: number }) =>
      new SignJWT({ nonce: claims.nonce ?? nonce })
        .setProtectedHeader({ alg: "RS256", kid: keyId })
        .setIssuer(claims.issuer ?? issuer)
        .setAudience(claims.audience ?? clientId)
        .setSubject("zitadel-subject")
        .setIssuedAt()
        .setExpirationTime(claims.expiresAt ?? Math.floor(Date.now() / 1000) + 300)
        .sign(privateKey)

    const validToken = await tokenCreate({})
    expect(await zitadelIdTokenVerify(issuer, clientId, validToken, nonce)).toMatchObject({
      sub: "zitadel-subject",
      nonce,
    })
    expect(
      await zitadelIdTokenVerify(issuer, clientId, await tokenCreate({ issuer: "https://wrong.test" }), nonce),
    ).toBeUndefined()
    expect(
      await zitadelIdTokenVerify(issuer, clientId, await tokenCreate({ audience: "another-client" }), nonce),
    ).toBeUndefined()
    expect(
      await zitadelIdTokenVerify(issuer, clientId, await tokenCreate({ nonce: "wrong-nonce" }), nonce),
    ).toBeUndefined()
    expect(await zitadelIdTokenVerify(issuer, clientId, await tokenCreate({ expiresAt: 1 }), nonce)).toBeUndefined()
    const otherKey = await generateKeyPair("RS256")
    const forgedToken = await new SignJWT({ nonce })
      .setProtectedHeader({ alg: "RS256", kid: keyId })
      .setIssuer(issuer)
      .setAudience(clientId)
      .setExpirationTime("5m")
      .sign(otherKey.privateKey)
    expect(await zitadelIdTokenVerify(issuer, clientId, forgedToken, nonce)).toBeUndefined()
    expect(await zitadelIdTokenVerify(issuer, clientId, "not-a-jwt", nonce)).toBeUndefined()
  } finally {
    globalThis.fetch = previousFetch
  }
})
