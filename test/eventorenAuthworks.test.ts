import { expect, test } from "bun:test"
import { eventorenAuthworks } from "../src/auth/server/eventorenAuthworks.ts"
import { eventorenSsoPageStateCreate } from "../src/auth/ui/eventorenSsoPageStateCreate.ts"

test("exposes the Authworks login destination alongside Zitadel", () => {
  const state = eventorenSsoPageStateCreate({ returnTo: () => "/admin" })

  expect(state.authworksLoginDestination()).toBe("/login/authworks?returnTo=%2Fadmin")
  expect(state.loginDestination()).toBe("/login/zitadel?returnTo=%2Fadmin")
})

test("exchanges the Authworks callback code with the configured client authentication", async () => {
  await withEnvironment(async () => {
    let tokenRequest: Request | undefined
    await withFetch(
      async (input, init) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/oauth2/token")) {
          tokenRequest = request
          return Response.json({ access_token: "access-token" })
        }
        return Response.json({})
      },
      async () => {
        const startResponse = await eventorenAuthworks.loginStart(
          new Request("https://eventoren.example.test/login/authworks"),
        )
        const cookie = startResponse.headers.get("set-cookie")
        const location = new URL(startResponse.headers.get("location") ?? "")
        const callbackResponse = await eventorenAuthworks.loginComplete(
          new Request(
            `https://eventoren.example.test/login/authworks/callback?code=authorization-code&state=${location.searchParams.get("state")}`,
            { headers: { cookie: cookie?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(callbackResponse.status).toBe(302)
        expect(callbackResponse.headers.get("location")).toBe("/sso?ssoError=exchange")
        const cleared = callbackResponse.headers.get("set-cookie") ?? ""
        expect(cleared).toContain("eventoren-zitadel-login=")
        expect(cleared).toContain("Max-Age=0")
        expect(tokenRequest?.method).toBe("POST")
        expect(tokenRequest?.headers.get("authorization")).toBe("Basic Y2xpZW50LWlkOmNsaWVudC1zZWNyZXQ=")
        const body = new URLSearchParams(await tokenRequest?.text())
        expect(body.get("grant_type")).toBe("authorization_code")
        expect(body.get("code")).toBe("authorization-code")
        expect(body.get("redirect_uri")).toBe("https://eventoren.example.test/login/authworks/callback")
        expect(body.get("code_verifier")).toMatch(/^[A-Za-z0-9_-]{43}$/u)
      },
    )
  })
})

test.each(["/admin", "/admin/bestellungen?event=event-1&q=Ada%20Lovelace#orders"])(
  "preserves returnTo=%s in cookie-authenticated Authworks callbacks without a session token in the URL",
  async (returnTo) => {
    await withEnvironment(async () => {
      await withFetch(
        async (input, init) => {
          const request = new Request(input, init)
          if (request.url.endsWith("/oauth2/token")) return Response.json({ access_token: "access-token" })
          if (request.url.endsWith("/oauth2/userinfo")) return Response.json({ sub: "authworks-user" })
          return Response.json({
            status: "success",
            value: {
              success: true,
              data: {
                token: "session-token",
                profile: { userId: "user-1", name: "Ada", role: "user" },
                hasPw: false,
                signedInMethod: "authworks",
                signedInAt: "2026-09-22T00:00:00.000Z",
                expiresAt: "2026-09-23T00:00:00.000Z",
              },
            },
          })
        },
        async () => {
          const startResponse = await eventorenAuthworks.loginStart(
            new Request(`https://eventoren.example.test/login/authworks?${new URLSearchParams({ returnTo })}`),
          )
          const cookie = startResponse.headers.get("set-cookie")
          const location = new URL(startResponse.headers.get("location") ?? "")
          const callbackResponse = await eventorenAuthworks.loginComplete(
            new Request(
              `https://eventoren.example.test/login/authworks/callback?code=authorization-code&state=${location.searchParams.get("state")}`,
              { headers: { cookie: cookie?.split(";", 1)[0] ?? "" } },
            ),
          )

          const redirectUrl = new URL(callbackResponse.headers.get("location") ?? "")
          expect(callbackResponse.status).toBe(302)
          expect(redirectUrl.pathname).toBe("/sign-in")
          expect(redirectUrl.searchParams.get("returnTo")).toBe(returnTo)
          expect(redirectUrl.searchParams.has("userSession")).toBe(false)
          expect(callbackResponse.headers.get("set-cookie")).toContain("eventoren-session=session-token")
        },
      )
    })
  },
)

test("rejects an Authworks callback received on a non-canonical origin", async () => {
  await withEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const startResponse = await eventorenAuthworks.loginStart(
          new Request("https://eventoren.example.test/login/authworks"),
        )
        const cookie = startResponse.headers.get("set-cookie")
        const location = new URL(startResponse.headers.get("location") ?? "")
        const response = await eventorenAuthworks.loginComplete(
          new Request(
            `https://alternate.example.test/login/authworks/callback?code=authorization-code&state=${location.searchParams.get("state")}`,
            { headers: { cookie: cookie?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=state")
        expect(response.headers.get("set-cookie")).toContain("eventoren-zitadel-login=")
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("does not start Authworks login without an application signing secret", async () => {
  await withEnvironment(async () => {
    delete process.env.AUTH_SECRET

    const response = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))

    expect(response.status).toBe(503)
  })
})

test("does not start Authworks login with a redirect URI outside the configured origin", async () => {
  await withEnvironment(async () => {
    process.env.AUTHWORKS_REDIRECT_URI = "https://alternate.example.test/login/authworks/callback"

    const response = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))

    expect(response.status).toBe(503)
  })
})

test("does not derive the Authworks origin from the incoming request", async () => {
  await withEnvironment(async () => {
    delete process.env.PUBLIC_BASE_URL_APP

    const response = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))

    expect(response.status).toBe(503)
  })
})

test("accepts Authworks login start behind reverse proxy forwarding headers", async () => {
  await withEnvironment(async () => {
    const response = await eventorenAuthworks.loginStart(
      new Request("http://eventoren.wonder1.de/login/authworks?returnTo=%2Fadmin", {
        headers: {
          host: "eventoren.example.test",
          "x-forwarded-host": "eventoren.example.test",
          "x-forwarded-proto": "https",
        },
      }),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toContain("https://authworks.contentoren.de/oauth2/authorize")
  })
})

test("requests the resource-owner scope without project-role scopes", async () => {
  await withEnvironment(async () => {
    const response = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))
    const location = new URL(response.headers.get("location") ?? "")
    const cookie = response.headers.get("set-cookie") ?? ""

    expect(location.searchParams.get("scope")).toContain("urn:zitadel:iam:user:resourceowner")
    expect(location.searchParams.get("scope")).not.toContain("urn:zitadel:iam:org:project")
    expect(cookie).toContain("HttpOnly")
  })
})

test("denies Authworks login when the organization membership claim does not match", async () => {
  await withEnvironment(async () => {
    process.env.AUTHWORKS_ORGANIZATION_ID = "eventoren-org"
    await withFetch(
      async (input, init) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/oauth2/token")) return Response.json({ access_token: "access-token" })
        if (request.url.endsWith("/oauth2/userinfo"))
          return Response.json({ sub: "subject-1", "urn:zitadel:iam:user:resourceowner:id": "other-org" })
        return Response.json({ status: "success", value: { success: false, errorMessage: "Test action stopped" } })
      },
      async () => {
        const start = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))
        const authorize = new URL(start.headers.get("location") ?? "")
        const callback = await eventorenAuthworks.loginComplete(
          new Request(
            `https://eventoren.example.test/login/authworks/callback?code=code&state=${authorize.searchParams.get("state")}`,
            { headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" } },
          ),
        )
        expect(callback.status).toBe(302)
        expect(callback.headers.get("location")).toBe("/sso?ssoError=exchange")
        expect(callback.headers.get("set-cookie")).toContain("eventoren-zitadel-login=")
      },
    )
  })
})

test("submits the verified Authworks profile without roles to the signed Convex action", async () => {
  await withEnvironment(async () => {
    process.env.AUTHWORKS_ORGANIZATION_ID = "eventoren-org"
    let submitted: Record<string, unknown> | undefined
    await withFetch(
      async (input, init) => {
        const request = new Request(input, init)
        if (request.url.endsWith("/oauth2/token")) return Response.json({ access_token: "access-token" })
        if (request.url.endsWith("/oauth2/userinfo"))
          return Response.json({
            sub: "subject-1",
            name: "Ada",
            email: "ada@example.test",
            email_verified: true,
            "urn:zitadel:iam:user:resourceowner:id": "eventoren-org",
          })
        submitted = (await request.json()) as Record<string, unknown>
        return Response.json({ status: "success", value: { success: false, errorMessage: "Test action stopped" } })
      },
      async () => {
        const start = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))
        const authorize = new URL(start.headers.get("location") ?? "")
        const callback = await eventorenAuthworks.loginComplete(
          new Request(
            `https://eventoren.example.test/login/authworks/callback?code=code&state=${authorize.searchParams.get("state")}`,
            { headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" } },
          ),
        )
        expect(callback.status).toBe(302)
        expect(callback.headers.get("location")).toBe("/sso?ssoError=exchange")
        const args = (submitted?.args as Array<Record<string, unknown>> | undefined)?.[0]
        expect(args).toMatchObject({ provider: "authworks", providerId: "subject-1" })
        expect(args).not.toHaveProperty("zitadelRoles")
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
    issuer: process.env.AUTHWORKS_ISSUER,
    clientId: process.env.AUTHWORKS_CLIENT_ID,
    clientSecret: process.env.AUTHWORKS_CLIENT_SECRET,
    redirectUri: process.env.AUTHWORKS_REDIRECT_URI,
    authSecret: process.env.AUTH_SECRET,
    organizationId: process.env.AUTHWORKS_ORGANIZATION_ID,
  }
  process.env.PUBLIC_BASE_URL_APP = "https://eventoren.example.test"
  process.env.AUTHWORKS_CLIENT_ID = "client-id"
  process.env.AUTHWORKS_CLIENT_SECRET = "client-secret"
  process.env.AUTHWORKS_REDIRECT_URI = "https://eventoren.example.test/login/authworks/callback"
  process.env.AUTH_SECRET = "eventoren-test-auth-secret"
  delete process.env.AUTHWORKS_ISSUER
  delete process.env.AUTHWORKS_ORGANIZATION_ID
  try {
    await callback()
  } finally {
    restore("PUBLIC_BASE_URL_APP", previous.appOrigin)
    restore("AUTHWORKS_ISSUER", previous.issuer)
    restore("AUTHWORKS_CLIENT_ID", previous.clientId)
    restore("AUTHWORKS_CLIENT_SECRET", previous.clientSecret)
    restore("AUTHWORKS_REDIRECT_URI", previous.redirectUri)
    restore("AUTH_SECRET", previous.authSecret)
    restore("AUTHWORKS_ORGANIZATION_ID", previous.organizationId)
  }
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
