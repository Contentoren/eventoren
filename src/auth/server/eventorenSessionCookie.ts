const sessionCookieName = "eventoren-session"
const loginCookieName = "eventoren-zitadel-login"
const loginCookieMaxAgeSeconds = 600
const sessionCookieMaxAgeSeconds = 60 * 60 * 24 * 30

type LoginState = {
  readonly state: string
  readonly verifier: string
  readonly returnTo: string
  readonly expiresAt: number
}

export const eventorenSessionCookie = {
  async loginCreate(state: string, verifier: string, returnTo: string, secure: boolean): Promise<string> {
    const payload = base64urlEncodeText(JSON.stringify({ state, verifier, returnTo, expiresAt: Date.now() + 600_000 }))
    const signed = `${payload}.${await sign(payload)}`
    return cookieCreate(loginCookieName, signed, loginCookieMaxAgeSeconds, secure)
  },

  async loginRead(cookieHeader: string | undefined): Promise<LoginState | undefined> {
    const signed = cookieRead(cookieHeader, loginCookieName)
    const payload = await signedPayloadRead(signed)
    if (!payload) return undefined

    try {
      const state = JSON.parse(payload) as Partial<LoginState>
      if (
        typeof state.state !== "string" ||
        typeof state.verifier !== "string" ||
        typeof state.returnTo !== "string" ||
        typeof state.expiresAt !== "number" ||
        state.expiresAt <= Date.now()
      )
        return undefined
      return state as LoginState
    } catch {
      return undefined
    }
  },

  loginClear(secure: boolean): string {
    return cookieClear(loginCookieName, secure)
  },

  sessionCreate(token: string, secure: boolean): string {
    return cookieCreate(sessionCookieName, token, sessionCookieMaxAgeSeconds, secure)
  },

  sessionRead(cookieHeader: string | undefined): string | undefined {
    return cookieRead(cookieHeader, sessionCookieName)
  },

  sessionClear(secure: boolean): string {
    return cookieClear(sessionCookieName, secure)
  },
} as const

async function signedPayloadRead(signed: string | undefined): Promise<string | undefined> {
  if (!signed) return undefined
  const separator = signed.lastIndexOf(".")
  if (separator <= 0) return undefined
  const payload = signed.slice(0, separator)
  const signature = signed.slice(separator + 1)
  if (!signature) return undefined
  if (signature !== (await sign(payload))) return undefined

  try {
    return base64urlDecodeText(payload)
  } catch {
    return undefined
  }
}

async function sign(value: string): Promise<string> {
  const secret = process.env.AUTH_SECRET?.trim()
  if (!secret || secret.startsWith("replace-with-")) return ""
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  )
  return base64urlEncodeBytes(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value))))
}

function cookieCreate(name: string, value: string, maxAgeSeconds: number, secure: boolean): string {
  const attributes = [
    `${name}=${encodeURIComponent(value)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ]
  if (secure) attributes.push("Secure")
  return attributes.join("; ")
}

function cookieClear(name: string, secure: boolean): string {
  const attributes = [`${name}=`, "Path=/", "HttpOnly", "SameSite=Lax", "Max-Age=0"]
  if (secure) attributes.push("Secure")
  return attributes.join("; ")
}

function cookieRead(header: string | undefined, name: string): string | undefined {
  if (!header) return undefined
  for (const part of header.split(";")) {
    const separator = part.indexOf("=")
    if (separator === -1 || part.slice(0, separator).trim() !== name) continue
    try {
      return decodeURIComponent(part.slice(separator + 1).trim())
    } catch {
      return undefined
    }
  }
  return undefined
}

function base64urlEncodeText(value: string): string {
  return base64urlEncodeBytes(new TextEncoder().encode(value))
}

function base64urlEncodeBytes(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "")
}

function base64urlDecodeText(value: string): string {
  const padding = (4 - (value.length % 4)) % 4
  const padded = value.replaceAll("-", "+").replaceAll("_", "/") + "=".repeat(padding)
  const binary = atob(padded)
  const bytes = Uint8Array.from(binary, (character) => character.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}
