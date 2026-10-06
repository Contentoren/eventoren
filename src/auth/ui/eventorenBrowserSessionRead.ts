import * as a from "valibot"
import { createResult, createResultError, type PromiseResult } from "#result"
import { type EventorenBrowserSession, eventorenBrowserSessionSchema } from "#src/auth/model/EventorenBrowserSession.ts"

export async function eventorenBrowserSessionRead(): PromiseResult<EventorenBrowserSession | null> {
  const op = "eventorenBrowserSessionRead"
  try {
    const response = await fetch("/api/session", { credentials: "same-origin", cache: "no-store" })
    if (!response.ok)
      return createResultError(op, "Die Anmeldung konnte nicht geprüft werden.", String(response.status))
    const body: unknown = await response.json()
    if (typeof body !== "object" || body === null || !("session" in body))
      return createResultError(op, "Ungültige Sitzungsantwort.", JSON.stringify(body))
    if (body.session === null) return createResult(null)
    const parsed = a.safeParse(eventorenBrowserSessionSchema, body.session)
    if (!parsed.success) return createResultError(op, a.summarize(parsed.issues), JSON.stringify(body))
    if (parsed.output.expiresAt <= Date.now()) return createResult(null)
    return createResult(parsed.output)
  } catch (error) {
    return createResultError(
      op,
      "Die Anmeldung konnte nicht geprüft werden.",
      error instanceof Error ? error.message : String(error),
    )
  }
}
