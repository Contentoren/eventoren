import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { eventorenLogoutMarkerCookie } from "#src/auth/model/eventorenLogoutMarkerCookie.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

export async function eventorenLogoutResponse(request: Request): Promise<Response> {
  const cookieToken = eventorenSessionCookie.sessionRead(request.headers.get("cookie") ?? undefined)
  const requestToken = await requestTokenRead(request)
  const tokens = [...new Set([cookieToken, requestToken].filter((value): value is string => Boolean(value)))]
  for (const token of tokens) {
    try {
      await new ConvexHttpClient(convexUrlGet()).mutation(api.auth.authSessionRevokeMutation, { token })
    } catch {
      // Clearing the browser session remains safe when the backend is temporarily unavailable.
    }
  }

  const headers = new Headers({ location: "/" })
  headers.append("set-cookie", eventorenSessionCookie.sessionClear(requestIsSecure(request)))
  headers.append("set-cookie", eventorenLogoutMarkerCookie.create(requestIsSecure(request)))
  return new Response(null, { status: 303, headers })
}

async function requestTokenRead(request: Request): Promise<string | undefined> {
  if (request.method !== "POST") return undefined
  try {
    const body = (await request.json()) as { token?: unknown }
    return typeof body.token === "string" && body.token.length > 0 ? body.token : undefined
  } catch {
    return undefined
  }
}

function requestIsSecure(request: Request): boolean {
  return (
    request.headers.get("x-forwarded-proto")?.includes("https") === true || new URL(request.url).protocol === "https:"
  )
}
