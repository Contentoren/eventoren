import { api } from "#convex/_generated/api.js"
import { ConvexHttpClient } from "convex/browser"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"

export async function eventorenLogoutResponse(request: Request): Promise<Response> {
  const token = eventorenSessionCookie.sessionRead(request.headers.get("cookie") ?? undefined)
  if (token) {
    try {
      await new ConvexHttpClient(convexUrlGet()).mutation(api.auth.authSessionRevokeMutation, { token })
    } catch {
      // Clearing the browser session remains safe when the backend is temporarily unavailable.
    }
  }

  const headers = new Headers({ location: "/" })
  headers.append("set-cookie", eventorenSessionCookie.sessionClear(requestIsSecure(request)))
  return new Response(null, { status: 303, headers })
}

function requestIsSecure(request: Request): boolean {
  return (
    request.headers.get("x-forwarded-proto")?.includes("https") === true || new URL(request.url).protocol === "https:"
  )
}
