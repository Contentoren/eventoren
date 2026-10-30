/**
 * Failure classes for the Eventoren SSO callbacks (`/login/zitadel/callback`
 * and `/login/authworks/callback`).
 *
 * - `cancelled`: the identity provider returned an error (e.g. the user
 *   cancelled the login).
 * - `state`: the attempt is expired or invalid (origin mismatch, missing or
 *   expired login cookie, missing code, state mismatch).
 * - `exchange`: the code exchange, userinfo lookup, proof creation, or
 *   session creation failed.
 */
export type EventorenSsoCallbackError = "cancelled" | "state" | "exchange"

/**
 * User-facing message for an `ssoError` code set by the SSO callbacks when
 * they redirect a failed attempt back to `/sso`.
 */
export function eventorenSsoErrorMessage(code: string | null): string {
  if (code === "cancelled") return "Die Anmeldung wurde abgebrochen. Bitte versuche es erneut."
  if (code === "state") return "Der Anmeldeversuch ist abgelaufen oder ungültig. Bitte melde dich erneut an."
  if (code === "exchange") return "Die Eventoren-Anmeldung konnte nicht abgeschlossen werden. Bitte versuche es erneut."
  return "Die Eventoren-Anmeldung ist fehlgeschlagen. Bitte versuche es erneut."
}

export function eventorenSsoErrorCodeRead(value: string | null): EventorenSsoCallbackError | undefined {
  if (value === "cancelled" || value === "state" || value === "exchange") return value
  return undefined
}
