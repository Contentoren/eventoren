import { expect, test } from "bun:test"
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

test("does not start Zitadel login without an application signing secret", async () => {
  await withEnvironment(async () => {
    delete process.env.AUTH_SECRET

    const response = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))

    expect(response.status).toBe(503)
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
  }
}

function restore(name: string, value: string | undefined) {
  if (value === undefined) delete process.env[name]
  else process.env[name] = value
}
