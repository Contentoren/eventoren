import { api } from "#convex/_generated/api.js"
import { ConvexHttpClient } from "convex/browser"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

const defaultIssuer = "https://auth.contentoren.de"
const resourceOwnerScope = "urn:zitadel:iam:user:resourceowner"

type ZitadelConfiguration = {
  readonly issuer: string
  readonly clientId: string
  readonly clientSecret: string
  readonly redirectUri: string
  readonly appOrigin: string
}

type UserInfo = Record<string, unknown>

export const eventorenZitadel = {
  async loginStart(request: Request): Promise<Response> {
    const config = configuration(request)
    if (!config) return new Response("Eventoren-Zitadel ist nicht konfiguriert.", { status: 503 })

    const state = randomValue()
    const verifier = randomValue()
    const returnTo = returnToRead(new URL(request.url).searchParams.get("returnTo"), config.appOrigin)
    const challenge = await sha256Base64url(verifier)
    const authorizeUrl = new URL(`${config.issuer}/oauth/v2/authorize`)
    authorizeUrl.searchParams.set("client_id", config.clientId)
    authorizeUrl.searchParams.set("response_type", "code")
    authorizeUrl.searchParams.set("redirect_uri", config.redirectUri)
    authorizeUrl.searchParams.set("scope", `openid profile email ${resourceOwnerScope}`)
    authorizeUrl.searchParams.set("state", state)
    authorizeUrl.searchParams.set("code_challenge", challenge)
    authorizeUrl.searchParams.set("code_challenge_method", "S256")

    return new Response(null, {
      status: 302,
      headers: {
        location: authorizeUrl.toString(),
        "set-cookie": await eventorenSessionCookie.loginCreate(state, verifier, returnTo, requestIsSecure(request)),
      },
    })
  },

  async loginComplete(request: Request): Promise<Response> {
    const config = configuration(request)
    if (!config) return new Response("Eventoren-Zitadel ist nicht konfiguriert.", { status: 503 })

    const url = new URL(request.url)
    const login = await eventorenSessionCookie.loginRead(request.headers.get("cookie") ?? undefined)
    const state = url.searchParams.get("state") ?? ""
    const code = url.searchParams.get("code") ?? ""
    if (url.searchParams.get("error") || !login || !code || login.state !== state) {
      return new Response("Die Eventoren-Anmeldung konnte nicht verifiziert werden.", { status: 400 })
    }

    const tokenResponse = await tokenExchange(config, code, login.verifier)
    if (!tokenResponse)
      return new Response("Die Eventoren-Anmeldung konnte nicht abgeschlossen werden.", { status: 502 })

    const userInfo = await userInfoRead(config.issuer, tokenResponse)
    if (!userInfo)
      return new Response("Die Eventoren-Benutzerinformationen konnten nicht geladen werden.", { status: 502 })

    const provider = userInfoToProvider(userInfo)
    const client = new ConvexHttpClient(convexUrlGet())
    let sessionResult
    try {
      sessionResult = await client.action(api.auth.authSignInUsingZitadelAction, provider)
    } catch {
      return new Response("Die Eventoren-Sitzung konnte nicht erstellt werden.", { status: 502 })
    }
    if (!sessionResult.success)
      return new Response("Die Eventoren-Sitzung konnte nicht erstellt werden.", { status: 403 })

    const redirectUrl = new URL("/sign-in", config.appOrigin)
    redirectUrl.searchParams.set("returnTo", login.returnTo)
    redirectUrl.searchParams.set("userSession", JSON.stringify(sessionResult.data))
    const headers = new Headers({ location: redirectUrl.toString() })
    headers.append("set-cookie", eventorenSessionCookie.loginClear(requestIsSecure(request)))
    headers.append(
      "set-cookie",
      eventorenSessionCookie.sessionCreate(sessionResult.data.token, requestIsSecure(request)),
    )
    return new Response(null, { status: 302, headers })
  },
} as const

function configuration(request: Request): ZitadelConfiguration | undefined {
  const clientId = process.env.ZITADEL_CLIENT_ID?.trim()
  const clientSecret = process.env.ZITADEL_CLIENT_SECRET?.trim()
  if (!clientId || !clientSecret) return undefined

  const appOrigin = (process.env.PUBLIC_BASE_URL_APP?.trim() || new URL(request.url).origin).replace(/\/$/u, "")
  const issuer = (process.env.ZITADEL_ISSUER?.trim() || defaultIssuer).replace(/\/$/u, "")
  return {
    issuer,
    clientId,
    clientSecret,
    appOrigin,
    redirectUri: process.env.ZITADEL_REDIRECT_URI?.trim() || `${appOrigin}/login/zitadel/callback`,
  }
}

async function tokenExchange(
  config: ZitadelConfiguration,
  code: string,
  verifier: string,
): Promise<string | undefined> {
  try {
    const response = await fetch(`${config.issuer}/oauth/v2/token`, {
      method: "POST",
      headers: {
        authorization: `Basic ${base64Encode(`${config.clientId}:${config.clientSecret}`)}`,
        "content-type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: config.redirectUri,
        code_verifier: verifier,
      }),
    })
    const body = (await response.json().catch(() => null)) as { access_token?: unknown } | null
    if (!response.ok || typeof body?.access_token !== "string") return undefined
    return body.access_token
  } catch {
    return undefined
  }
}

async function userInfoRead(issuer: string, accessToken: string): Promise<UserInfo | undefined> {
  try {
    const response = await fetch(`${issuer}/oidc/v1/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const body = (await response.json().catch(() => null)) as UserInfo | null
    if (!response.ok || !body || typeof body.sub !== "string" || body.sub.length === 0) return undefined
    return body
  } catch {
    return undefined
  }
}

function userInfoToProvider(userInfo: UserInfo) {
  const name = claimString(userInfo, "name")
  const givenName = claimString(userInfo, "given_name") || name
  const familyName = claimString(userInfo, "family_name")
  const username =
    claimString(userInfo, "preferred_username") || claimString(userInfo, "nickname") || (userInfo.sub as string)
  return {
    provider: "zitadel" as const,
    providerId: userInfo.sub as string,
    givenName,
    familyName,
    image: claimString(userInfo, "picture"),
    username,
    email: claimString(userInfo, "email"),
  }
}

function claimString(userInfo: UserInfo, key: string): string {
  const value = userInfo[key]
  return typeof value === "string" ? value.trim() : ""
}

function returnToRead(value: string | null, appOrigin: string): string {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  try {
    const url = new URL(value, appOrigin)
    if (url.origin !== appOrigin) return "/"
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return "/"
  }
}

function requestIsSecure(request: Request): boolean {
  return (
    request.headers.get("x-forwarded-proto")?.includes("https") === true || new URL(request.url).protocol === "https:"
  )
}

function randomValue(): string {
  const bytes = new Uint8Array(32)
  crypto.getRandomValues(bytes)
  return base64urlEncode(bytes)
}

async function sha256Base64url(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))
  return base64urlEncode(new Uint8Array(digest))
}

function base64Encode(value: string): string {
  let binary = ""
  for (const byte of new TextEncoder().encode(value)) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function base64urlEncode(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}
