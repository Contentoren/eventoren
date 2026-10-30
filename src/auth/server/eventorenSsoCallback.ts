import type { EventorenSsoCallbackError } from "../model/eventorenSsoErrorMessage.ts"
import { eventorenSessionCookie } from "./eventorenSessionCookie.ts"

/**
 * Shared failure handling for the Eventoren SSO callbacks
 * (`/login/zitadel/callback` and `/login/authworks/callback`).
 *
 * A failed callback must never leave the user on a dead-end error page: the
 * authorization code is single-use, so reloading the callback URL can never
 * succeed. Failures redirect back to `/sso` with an error code instead, so
 * one click starts a fresh login attempt. The Location header is a constant
 * same-origin path, never derived from request input.
 */
export function eventorenSsoCallbackErrorRedirect(request: Request, error: EventorenSsoCallbackError): Response {
  const headers = new Headers({ location: `/sso?ssoError=${error}` })
  headers.append("set-cookie", eventorenSessionCookie.loginClear(requestIsSecure(request)))
  return new Response(null, { status: 302, headers })
}

function requestIsSecure(request: Request): boolean {
  return (
    request.headers.get("x-forwarded-proto")?.includes("https") === true || new URL(request.url).protocol === "https:"
  )
}
