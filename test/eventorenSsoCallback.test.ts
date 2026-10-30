import { expect, test } from "bun:test"
import { eventorenSsoErrorCodeRead, eventorenSsoErrorMessage } from "../src/auth/model/eventorenSsoErrorMessage.ts"
import { eventorenSsoSearchParse } from "../src/auth/model/eventorenSsoSearchParse.ts"
import { eventorenAuthworks } from "../src/auth/server/eventorenAuthworks.ts"
import { eventorenSsoCallbackErrorRedirect } from "../src/auth/server/eventorenSsoCallback.ts"
import { eventorenZitadel } from "../src/auth/server/eventorenZitadel.ts"

test("ssoErrorMessage explains each callback failure in German", () => {
  expect(eventorenSsoErrorMessage("cancelled")).toBe("Die Anmeldung wurde abgebrochen. Bitte versuche es erneut.")
  expect(eventorenSsoErrorMessage("state")).toBe(
    "Der Anmeldeversuch ist abgelaufen oder ungültig. Bitte melde dich erneut an.",
  )
  expect(eventorenSsoErrorMessage("exchange")).toBe(
    "Die Eventoren-Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut.",
  )
})

test("ssoErrorMessage falls back for unknown codes", () => {
  for (const code of [null, "", "other"]) {
    expect(eventorenSsoErrorMessage(code)).toBe("Die Eventoren-Anmeldung ist fehlgeschlagen. Bitte versuche es erneut.")
  }
})

test("ssoErrorCodeRead accepts only known failure classes", () => {
  expect(eventorenSsoErrorCodeRead("cancelled")).toBe("cancelled")
  expect(eventorenSsoErrorCodeRead("state")).toBe("state")
  expect(eventorenSsoErrorCodeRead("exchange")).toBe("exchange")
  expect(eventorenSsoErrorCodeRead(null)).toBeUndefined()
  expect(eventorenSsoErrorCodeRead("other")).toBeUndefined()
})

test("ssoSearchParse passes the error flag through without touching returnTo rules", () => {
  expect(eventorenSsoSearchParse({ returnTo: "/admin", ssoError: "state" })).toEqual({
    returnTo: "/admin",
    ssoError: "state",
  })
  expect(eventorenSsoSearchParse({ returnTo: "/admin" })).toEqual({ returnTo: "/admin", ssoError: undefined })
  expect(eventorenSsoSearchParse({ returnTo: "//malicious.example.test", ssoError: "exchange" })).toEqual({
    returnTo: undefined,
    ssoError: "exchange",
  })
})

for (const error of ["cancelled", "state", "exchange"] as const) {
  test(`ssoCallbackErrorRedirect sends a failed ${error} attempt back to the SSO page`, () => {
    const response = eventorenSsoCallbackErrorRedirect(
      new Request("https://eventoren.example.test/login/zitadel/callback"),
      error,
    )

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe(`/sso?ssoError=${error}`)
  })
}

test("ssoCallbackErrorRedirect clears the stale login cookie with matching attributes", () => {
  const secure = eventorenSsoCallbackErrorRedirect(
    new Request("https://eventoren.example.test/login/zitadel/callback"),
    "state",
  )
  const secureCleared = secure.headers.get("set-cookie") ?? ""
  expect(secureCleared.startsWith("eventoren-zitadel-login=;")).toBe(true)
  expect(secureCleared).toContain("Path=/")
  expect(secureCleared).toContain("HttpOnly")
  expect(secureCleared).toContain("SameSite=Lax")
  expect(secureCleared).toContain("Max-Age=0")
  expect(secureCleared).toContain("Secure")

  const insecure = eventorenSsoCallbackErrorRedirect(new Request("http://eventoren.example.test/sso"), "exchange")
  expect(insecure.headers.get("set-cookie")).not.toContain("Secure")
})

test("Zitadel callback maps an IdP error to cancelled without calling the provider", async () => {
  await withZitadelEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const response = await eventorenZitadel.loginComplete(
          new Request("https://eventoren.example.test/login/zitadel/callback?error=access_denied"),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=cancelled")
        expect(response.headers.get("set-cookie")).toContain("eventoren-zitadel-login=")
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("Zitadel callback maps a missing code to state without calling the provider", async () => {
  await withZitadelEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const start = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))
        const authorize = new URL(start.headers.get("location") ?? "")
        const response = await eventorenZitadel.loginComplete(
          new Request(
            `https://eventoren.example.test/login/zitadel/callback?state=${authorize.searchParams.get("state")}`,
            { headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=state")
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("Zitadel callback maps a state mismatch to state without calling the provider", async () => {
  await withZitadelEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const start = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))
        const response = await eventorenZitadel.loginComplete(
          new Request("https://eventoren.example.test/login/zitadel/callback?code=code&state=forged-state", {
            headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" },
          }),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=state")
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("Zitadel callback maps a token exchange failure to exchange", async () => {
  await withZitadelEnvironment(async () => {
    await withFetch(
      async (input) => {
        if (new Request(input).url.endsWith("/oauth/v2/token"))
          return new Response("upstream", { status: 500, headers: { "content-type": "text/plain" } })
        return Response.json({})
      },
      async () => {
        const start = await eventorenZitadel.loginStart(new Request("https://eventoren.example.test/login/zitadel"))
        const authorize = new URL(start.headers.get("location") ?? "")
        const response = await eventorenZitadel.loginComplete(
          new Request(
            `https://eventoren.example.test/login/zitadel/callback?code=code&state=${authorize.searchParams.get("state")}`,
            { headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=exchange")
      },
    )
  })
})

test("Zitadel callback keeps a constant same-origin location even for hostile input", async () => {
  await withZitadelEnvironment(async () => {
    const response = await eventorenZitadel.loginComplete(
      new Request(
        "https://eventoren.example.test/login/zitadel/callback?error=access_denied&returnTo=https%3A%2F%2Fmalicious.example.test",
      ),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/sso?ssoError=cancelled")
  })
})

test("Zitadel callback without provider configuration redirects to exchange", async () => {
  await withZitadelEnvironment(async () => {
    delete process.env.ZITADEL_CLIENT_ID
    const response = await eventorenZitadel.loginComplete(
      new Request("https://eventoren.example.test/login/zitadel/callback?code=code&state=state"),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/sso?ssoError=exchange")
  })
})

test("Authworks callback maps an IdP error to cancelled without calling the provider", async () => {
  await withAuthworksEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const response = await eventorenAuthworks.loginComplete(
          new Request("https://eventoren.example.test/login/authworks/callback?error=access_denied"),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=cancelled")
        expect(response.headers.get("set-cookie")).toContain("eventoren-zitadel-login=")
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("Authworks callback maps a missing login cookie to state without calling the provider", async () => {
  await withAuthworksEnvironment(async () => {
    let fetchCalled = false
    await withFetch(
      async () => {
        fetchCalled = true
        return Response.json({ access_token: "access-token" })
      },
      async () => {
        const response = await eventorenAuthworks.loginComplete(
          new Request("https://eventoren.example.test/login/authworks/callback?code=code&state=state"),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=state")
        expect(fetchCalled).toBe(false)
      },
    )
  })
})

test("Authworks callback maps a token exchange failure to exchange", async () => {
  await withAuthworksEnvironment(async () => {
    await withFetch(
      async (input) => {
        if (new Request(input).url.endsWith("/oauth2/token"))
          return new Response("upstream", { status: 500, headers: { "content-type": "text/plain" } })
        return Response.json({})
      },
      async () => {
        const start = await eventorenAuthworks.loginStart(new Request("https://eventoren.example.test/login/authworks"))
        const authorize = new URL(start.headers.get("location") ?? "")
        const response = await eventorenAuthworks.loginComplete(
          new Request(
            `https://eventoren.example.test/login/authworks/callback?code=code&state=${authorize.searchParams.get("state")}`,
            { headers: { cookie: start.headers.get("set-cookie")?.split(";", 1)[0] ?? "" } },
          ),
        )

        expect(response.status).toBe(302)
        expect(response.headers.get("location")).toBe("/sso?ssoError=exchange")
      },
    )
  })
})

test("Authworks callback without provider configuration redirects to exchange", async () => {
  await withAuthworksEnvironment(async () => {
    delete process.env.AUTHWORKS_CLIENT_ID
    const response = await eventorenAuthworks.loginComplete(
      new Request("https://eventoren.example.test/login/authworks/callback?code=code&state=state"),
    )

    expect(response.status).toBe(302)
    expect(response.headers.get("location")).toBe("/sso?ssoError=exchange")
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

async function withZitadelEnvironment(callback: () => Promise<void>) {
  const previous = {
    appOrigin: process.env.PUBLIC_BASE_URL_APP,
    clientId: process.env.ZITADEL_CLIENT_ID,
    clientSecret: process.env.ZITADEL_CLIENT_SECRET,
    redirectUri: process.env.ZITADEL_REDIRECT_URI,
    authSecret: process.env.AUTH_SECRET,
    organizationId: process.env.OIDC_ZITADEL_ORG_ID,
    projectId: process.env.ZITADEL_PROJECT_ID,
  }
  process.env.PUBLIC_BASE_URL_APP = "https://eventoren.example.test"
  process.env.ZITADEL_CLIENT_ID = "client-id"
  process.env.ZITADEL_CLIENT_SECRET = "client-secret"
  process.env.ZITADEL_REDIRECT_URI = "https://eventoren.example.test/login/zitadel/callback"
  process.env.AUTH_SECRET = "eventoren-test-auth-secret"
  delete process.env.OIDC_ZITADEL_ORG_ID
  delete process.env.ZITADEL_PROJECT_ID
  try {
    await callback()
  } finally {
    restore("PUBLIC_BASE_URL_APP", previous.appOrigin)
    restore("ZITADEL_CLIENT_ID", previous.clientId)
    restore("ZITADEL_CLIENT_SECRET", previous.clientSecret)
    restore("ZITADEL_REDIRECT_URI", previous.redirectUri)
    restore("AUTH_SECRET", previous.authSecret)
    restore("OIDC_ZITADEL_ORG_ID", previous.organizationId)
    restore("ZITADEL_PROJECT_ID", previous.projectId)
  }
}

async function withAuthworksEnvironment(callback: () => Promise<void>) {
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
