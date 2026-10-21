import { createResult, createResultError, type PromiseResult } from "#result"

/** Convex pagination is throwing I/O (e.g. an invalid/expired native cursor).
 * Keep native diagnostics and document contents out of public error payloads. */
export async function organizerDashboardOrderPageRead<T>(read: () => Promise<T>): PromiseResult<T> {
  try {
    return createResult(await read())
  } catch {
    return createResultError(
      "organizerDashboardOrderPageRead",
      "Seite konnte nicht geladen werden. Bitte mit dem ersten Fenster neu beginnen.",
    )
  }
}
