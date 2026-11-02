import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import type { PromiseResult } from "#result"
import { envAuthSecretResult } from "#src/app/env/private/envAuthSecretResult.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { authworksLoginProofCreate } from "./authworksLoginProofCreate.ts"
import { eventorenAuthworksProviderCreate } from "./eventorenAuthworksProviderCreate.ts"
import { eventorenSsoCallbackErrorRedirect } from "./eventorenSsoCallback.ts"
import type { EventorenSsoCallbackError } from "../model/eventorenSsoErrorMessage.ts"
import type { CommonAuthProvider } from "./social_identity_providers/CommonAuthProvider.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

const defaultIssuer = "https://authworks.contentoren.de"
const resourceOwnerScope = "urn:zitadel:iam:user:resourceowner"
const resourceOwnerIdClaim = "urn:zitadel:iam:user:resourceowner:id"

type AuthworksConfiguration = {
  readonly issuer: string
  readonly clientId: string
  readonly clientSecret: string
  readonly redirectUri: string
  readonly appOrigin: string
  readonly organizationId?: string
}

type UserInfo = Record<string, unknown>
type TokenResponse = { readonly access_token?: unknown }

export const eventorenAuthworks = {
  async loginStart(request: Request): Promise<Response> {
    const config = configuration()
    if (!config) return new Response("Eventoren-Authworks ist nicht konfiguriert.", { status: 503 })
    if (requestOriginRead(request) !== config.appOrigin)
      return loginErrorResponse(request, "state")

    const state = randomValue()
    const verifier = randomValue()
    const returnTo = returnToRead(new URL(request.url).searchParams.get("returnTo"), config.appOrigin)
    const challenge = await sha256Base64url(verifier)
    const authorizeUrl = new URL(`${config.issuer}/oauth2/authorize`)
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
    const config = configuration()
    if (!config) return eventorenSsoCallbackErrorRedirect(request, "exchange")

    const url = new URL(request.url)
    const login = await eventorenSessionCookie.loginRead(request.headers.get("cookie") ?? undefined)
    const state = url.searchParams.get("state") ?? ""
    const code = url.searchParams.get("code") ?? ""
    if (url.searchParams.get("error")) return loginErrorResponse(request, "cancelled")
    if (requestOriginRead(request) !== config.appOrigin || !login || !code || login.state !== state) {
      return loginErrorResponse(request, "state")
    }

    const tokenResponse = await tokenExchange(config, code, login.verifier)
    if (!tokenResponse) return loginErrorResponse(request, "exchange")

    const userInfo = await userInfoRead(config.issuer, tokenResponse.access_token as string)
    if (!userInfo) return loginErrorResponse(request, "exchange")
    if (config.organizationId && userInfo[resourceOwnerIdClaim] !== config.organizationId)
      return loginErrorResponse(request, "exchange")

    let provider: CommonAuthProvider = eventorenAuthworksProviderCreate(userInfo)
    const proof = await authworksLoginProofCreate(provider, config.organizationId)
    if (!proof) return loginErrorResponse(request, "exchange")
    provider = { ...provider, zitadelRoleSyncProof: proof }
    const convexUrl = convexUrlGet()
    const client = new ConvexHttpClient(convexUrl)
    let sessionResult: Awaited<PromiseResult<UserSession>>
    try {
      sessionResult = await client.action(api.auth.authSignInUsingAuthworksAction, provider)
    } catch (error) {
      console.error("Authworks sign-in: Convex action failed", {
        convexHost: new URL(convexUrl).hostname,
        errorName: error instanceof Error ? error.name : "unknown",
        errorCode: error instanceof Error ? error.message.match(/\berror code: (\d{3,4})\b/u)?.[1] : undefined,
      })
      return loginErrorResponse(request, "exchange")
    }
    if (!sessionResult.success) return loginErrorResponse(request, "exchange")

    const redirectUrl = new URL("/sign-in", config.appOrigin)
    redirectUrl.searchParams.set("returnTo", login.returnTo)
    const headers = new Headers({ location: redirectUrl.toString() })
    headers.append("set-cookie", eventorenSessionCookie.loginClear(requestIsSecure(request)))
    headers.append(
      "set-cookie",
      eventorenSessionCookie.sessionCreate(sessionResult.data.token, requestIsSecure(request)),
    )
    return new Response(null, { status: 302, headers })
  },
} as const

function loginErrorResponse(request: Request, error: EventorenSsoCallbackError): Response {
  return eventorenSsoCallbackErrorRedirect(request, error)
}

function configuration(): AuthworksConfiguration | undefined {
  const clientId = process.env.AUTHWORKS_CLIENT_ID?.trim()
  const clientSecret = process.env.AUTHWORKS_CLIENT_SECRET?.trim()
  const authSecret = envAuthSecretResult()
  if (!clientId || !clientSecret || !authSecret.success) return undefined

  const appOrigin = originRead(process.env.PUBLIC_BASE_URL_APP?.trim())
  if (!appOrigin) return undefined
  const issuer = (process.env.AUTHWORKS_ISSUER?.trim() || defaultIssuer).replace(/\/$/u, "")
  const redirectUri = redirectUriRead(process.env.AUTHWORKS_REDIRECT_URI?.trim(), appOrigin)
  if (!redirectUri) return undefined
  const organizationId = process.env.AUTHWORKS_ORGANIZATION_ID?.trim()
  return {
    issuer,
    clientId,
    clientSecret,
    appOrigin,
    redirectUri,
    ...(organizationId ? { organizationId } : {}),
  }
}

function originRead(value: string | undefined): string | undefined {
  if (!value) return undefined
  try {
    const url = new URL(value)
    if (
      (url.protocol !== "http:" && url.protocol !== "https:") ||
      url.username ||
      url.password ||
      url.pathname !== "/" ||
      url.search ||
      url.hash
    )
      return undefined
    return url.origin
  } catch {
    return undefined
  }
}

function redirectUriRead(value: string | undefined, appOrigin: string): string | undefined {
  const redirectUri = value || `${appOrigin}/login/authworks/callback`
  try {
    const url = new URL(redirectUri)
    if (
      url.origin !== appOrigin ||
      url.username ||
      url.password ||
      url.pathname !== "/login/authworks/callback" ||
      url.search ||
      url.hash
    )
      return undefined
    return url.toString()
  } catch {
    return undefined
  }
}

async function tokenExchange(
  config: AuthworksConfiguration,
  code: string,
  verifier: string,
): Promise<TokenResponse | undefined> {
  try {
    const response = await fetch(`${config.issuer}/oauth2/token`, {
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
    const body = (await response.json().catch(() => null)) as TokenResponse | null
    if (!response.ok || typeof body?.access_token !== "string") {
      console.error("Authworks sign-in: token exchange failed", {
        status: response.status,
        contentType: response.headers.get("content-type"),
        cfRay: response.headers.get("cf-ray"),
      })
      return undefined
    }
    return body
  } catch (error) {
    console.error("Authworks sign-in: token exchange fetch failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    })
    return undefined
  }
}

async function userInfoRead(issuer: string, accessToken: string): Promise<UserInfo | undefined> {
  try {
    const response = await fetch(`${issuer}/oauth2/userinfo`, {
      headers: { authorization: `Bearer ${accessToken}` },
    })
    const body = (await response.json().catch(() => null)) as UserInfo | null
    if (!response.ok || !body || typeof body.sub !== "string" || body.sub.length === 0) {
      console.error("Authworks sign-in: userinfo failed", {
        status: response.status,
        contentType: response.headers.get("content-type"),
        cfRay: response.headers.get("cf-ray"),
      })
      return undefined
    }
    return body
  } catch (error) {
    console.error("Authworks sign-in: userinfo fetch failed", {
      errorName: error instanceof Error ? error.name : "unknown",
    })
    return undefined
  }
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

function requestOriginRead(request: Request): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host")
  if (host) {
    const proto = request.headers.get("x-forwarded-proto") || (requestIsSecure(request) ? "https" : "http")
    return `${proto}://${host}`
  }
  return new URL(request.url).origin
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
