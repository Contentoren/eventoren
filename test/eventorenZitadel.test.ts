import { expect, test } from "bun:test"
import { exportJWK, generateKeyPair, SignJWT } from "jose"
import { eventorenZitadel } from "../src/auth/server/eventorenZitadel.ts"

test("exchanges the Zitadel callback code with the configured client authentication", async () => {
  await withEnvironment(async () => {
    let tokenRequest: Request | undefined
    await withFetch(
      async (input, init) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/oauth/v2/token")) {
          tokenRequest = request
          return Response.json({ access_token: "access-token" })
        }
        return Response.json({})
      },
      async () => {
        const startResponse = await eventorenZitadel.loginStart(
          new Request("https://eventoren.example.test/login/zitadel"),
        )
        const cookie = startResponse.headers.get("set-cookie")
        const location = new URL(startResponse.headers.get("location") ?? "")
        const callbackResponse = await eventorenZitadel.loginComplete(
          new Request(
            `https://eventoren.example.test/login/zitadel/callback?code=authorization-code&state=${location.searchParams.get("state")}`,
            { headers: { cookie: cookie?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(callbackResponse.status).toBe(502)
        expect(await callbackResponse.text()).toBe("Die Eventoren-Benutzerinformationen konnten nicht geladen werden.")
        expect(tokenRequest?.method).toBe("POST")
        expect(tokenRequest?.headers.get("authorization")).toBe("Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=")
        const body = new URLSearchParams(await tokenRequest?.text())
        expect(body.get("grant_type")).toBe("authorization_code")
        expect(body.get("code")).toBe("authorization-code")
        expect(body.get("redirect_uri")).toBe("https://eventoren.example.test/login/zitadel/callback")
        expect(body.get("code_verifier")).toMatch(/^[A-Za-z0-9_-]{43}$/u)
      },
    )
  })
})

test("redirects cookie-authenticated Zitadel callbacks without a session token in the URL", async () => {
  await withEnvironment(async () => {
    await withFetch(
      async (input, init) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/oauth/v2/token")) return Response.json({ access_token: "access-token" })
        if (request.url.endsWith("/oidc/v1/userinfo")) return Response.json({ sub: "zitadel-user" })
        return Response.json({
          status: "success",
          value: {
            success: true,
            data: {
              token: "session-token",
              profile: { userId: "user-1", name: "Ada", role: "user" },
              hasPw: false,
              signedInMethod: "zitadel",
              signedInAt: "2026-09-22T00:00:00.000Z",
              expiresAt: "2026-09-23T00:00:00.000Z",
            },
          },
        })
      },
      async () => {
        const startResponse = await eventorenZitadel.loginStart(
          new Request("https://eventoren.example.test/login/zitadel?returnTo=%2Fadmin"),
        )
        const cookie = startResponse.headers.get("set-cookie")
        const location = new URL(startResponse.headers.get("location") ?? "")
        const callbackResponse = await eventorenZitadel.loginComplete(
          new Request(
            `https://eventoren.example.test/login/zitadel/callback?code=authorization-code&state=${location.searchParams.get("state")}`,
            { headers: { cookie: cookie?.split(";", 1)[0] ?? "" } },
          ),
        )

        const redirectUrl = new URL(callbackResponse.headers.get("location") ?? "")
        expect(callbackResponse.status).toBe(302)
        expect(redirectUrl.pathname).toBe("/sign-in")
        expect(redirectUrl.searchParams.get("returnTo")).toBe("/admin")
        expect(redirectUrl.searchParams.has("userSession")).toBe(false)
        expect(callbackResponse.headers.get("set-cookie")).toContain("eventoren-session=session-token")
      },
    )
  })
})

test("does not start Zitadel login without an application signing secret", async () => {
  await withEnvironment(async () => {
    delete process.env.AUTH_SECRET

    const response = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))

    expect(response.status).toBe(503)
  })
})

test("rejects a Zitadel callback received on a non-canonical origin", async () => {
  await withEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const startResponse = await eventorenZitadel.loginStart(
          new Request("https://eventoren.example.test/login/zitadel"),
        )
        const cookie = startResponse.headers.get("set-cookie")
        const location = new URL(startResponse.headers.get("location") ?? "")
        const response = await eventorenZitadel.loginComplete(
          new Request(
            `https://alternate.example.test/login/zitadel/callback?code=authorization-code&state=${location.searchParams.get("state")}`,
            { headers: { cookie: cookie?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(response.status).toBe(400)
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("does not start Zitadel login with a redirect URI outside the configured origin", async () => {
  await withEnvironment(async () => {
    process.env.ZITADEL_REDIRECT_URI = "https://alternate.example.test/login/zitadel/callback"

    const response = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))

    expect(response.status).toBe(503)
  })
})

test("does not derive the Zitadel origin from the incoming request", async () => {
  await withEnvironment(async () => {
    delete process.env.PUBLIC_BASE_URL_APP

    const response = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))

    expect(response.status).toBe(503)
  })
})

test("accepts Zitadel login start behind reverse proxy forwarding headers", async () => {
  await withEnvironment(async () => {
    const response = await eventorenZitadel.loginStart(
      new Request("http://eventoren.leonardomora.de/login/zitadel?returnTo=%2Fadmin", {
        headers: {
          host: "eventoren.example.test",
          "x-forwarded-host": "eventoren.example.test",
          "x-forwarded-proto": "https",
        },
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("https://auth.contentoren.de/oauth/v2/authorize")
  })
})

test("requests the Zitadel project-role scope and stores a nonce only when organization sync is enabled", async () => {
  await withEnvironment(async () => {
    process.env.OIDC_ZITADEL_ORG_ID = "eventoren-org"

    const response = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))
    const location = new URL(response.headers.get("location") ?? "")
    const cookie = response.headers.get("set-cookie") ?? ""

    expect(location.searchParams.get("scope")).toContain("urn:zitadel:iam:user:resourceowner")
    expect(location.searchParams.get("scope")).toContain("urn:zitadel:iam:org:project:roles")
    expect(location.searchParams.get("nonce")).toBeTruthy()
    expect(cookie).toContain("HttpOnly")
  })
})

test("configured callback passes only verified organization roles to the signed Convex action", async () => {
  await withEnvironment(async () => {
    process.env.OIDC_ZITADEL_ORG_ID = "eventoren-org"
    const { privateKey, publicKey } = await generateKeyPair("RS256")
    const jwk = await exportJWK(publicKey)
    let submitted: Record<string, unknown> | undefined
    let idToken = ""
    await withFetch(
      async (input, init) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/oauth/v2/keys"))
          return Response.json({ keys: [{ ...jwk, kid: "key-1", alg: "RS256", use: "sig" }] })
        if (request.url.endsWith("/oauth/v2/token"))
          return Response.json({ access_token: "access-token", id_token: idToken })
        if (request.url.endsWith("/oidc/v1/userinfo"))
          return Response.json({
            sub: "subject-1",
            "urn:zitadel:iam:org:project:roles": { admin: { "eventoren-org": "Untrusted userinfo" } },
          })
        submitted = (await request.json()) as Record<string, unknown>
        return Response.json({ status: "success", value: { success: false, errorMessage: "Test action stopped" } })
      },
      async () => {
        const start = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))
        const authorize = new URL(start.headers.get("location") ?? "")
        idToken = await new SignJWT({
          nonce: authorize.searchParams.get("nonce"),
          "urn:zitadel:iam:org:project:roles": {
            admin: { "other-org": "Other" },
            organizer: { "eventoren-org": "Eventoren" },
          },
        })
          .setProtectedHeader({ alg: "RS256", kid: "key-1" })
          .setIssuer("https://auth.contentoren.de")
          .setAudience("client-id")
          .setSubject("subject-1")
          .setExpirationTime("5m")
          .sign(privateKey)
        const callback = await eventorenZitadel.loginComplete(
          new Request(
            `https://eventoren.example.test/login/zitadel/callback?code=code&state=${authorize.searchParams.get("state")}`,
            { headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" } },
          ),
        )
        expect(callback.status).toBe(403)
        const args = (submitted?.args as Array<Record<string, unknown>> | undefined)?.[0]
        expect(args).toMatchObject({
          providerId: "subject-1",
          zitadelRoles: ["organizer"],
          zitadelRoleSyncEnabled: true,
        })
        expect(args?.zitadelRoleSyncProof).toBeString()
      },
    )
  })
})

async function withFetch(
  implementation: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>,
  callback: () => Promise<void>,
) {
  const previous = globalThis.fetch
  globalThis.fetch = Object.assign(implementation, { preconnect: previous.preconnect })
  try {
    await callback()
  } finally {
    globalThis.fetch = previous
  }
}

async function withEnvironment(callback: () => Promise<void>) {
  const previous = {
    appOrigin: process.env.PUBLIC_BASE_URL_APP,
    clientId: process.env.ZITADEL_CLIENT_ID,
    clientSecret: process.env.ZITADEL_CLIENT_SECRET,
    redirectUri: process.env.ZITADEL_REDIRECT_URI,
    authSecret: process.env.AUTH_SECRET,
    organizationId: process.env.OIDC_ZITADEL_ORG_ID,
  }
  process.env.PUBLIC_BASE_URL_APP = "https://eventoren.example.test"
  process.env.ZITADEL_CLIENT_ID = "client-id"
  process.env.ZITADEL_CLIENT_SECRET = "client-secret"
  process.env.ZITADEL_REDIRECT_URI = "https://eventoren.example.test/login/zitadel/callback"
  process.env.AUTH_SECRET = "eventoren-test-auth-secret"
  try {
    await callback()
  } finally {
    restore("PUBLIC_BASE_URL_APP", previous.appOrigin)
    restore("ZITADEL_CLIENT_ID", previous.clientId)
    restore("ZITADEL_CLIENT_SECRET", previous.clientSecret)
    restore("ZITADEL_REDIRECT_URI", previous.redirectUri)
    restore("AUTH_SECRET", previous.authSecret)
    restore("OIDC_ZITADEL_ORG_ID", previous.organizationId)
  }
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
