import { ConvexHttpClient } from "convex/browser"
import { api } from "#convex/_generated/api.js"
import { eventorenLogoutMarkerCookie } from "#src/auth/model/eventorenLogoutMarkerCookie.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

export async function eventorenLogoutResponse(request: Request): Promise<Response> {
  const cookieToken = eventorenSessionCookie.sessionRead(request.headers.get("cookie") ?? undefined)
  if (cookieToken) {
    try {
      await new ConvexHttpClient(convexUrlGet()).mutation(api.auth.authSessionRevokeMutation, { token: cookieToken })
    } catch {
      // Clearing the browser session remains safe when the backend is temporarily unavailable.
    }
  }

  const headers = new Headers({ location: "/" })
  headers.append("set-cookie", eventorenSessionCookie.sessionClear(requestIsSecure(request)))
  headers.append("set-cookie", eventorenLogoutMarkerCookie.create(requestIsSecure(request)))
  return new Response(null, { status: 303, headers })
}

function requestIsSecure(request: Request): boolean {
  return (
    request.headers.get("x-forwarded-proto")?.includes("https") === true || new URL(request.url).protocol === "https:"
  )
}
