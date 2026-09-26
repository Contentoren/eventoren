import { createResultError } from "#result"

export function scannerLinkAdminBackendFailureGet(op: string, error: unknown) {
  const message = error instanceof Error ? error.message : ""
  if (/Could not find function for 'scannerLinks:scannerLinkAdmin(?:CreateMutation|ListQuery)'/.test(message)) {
    return createResultError(op, "Scannerlink-Funktionen fehlen im Backend. Bitte Backend aktualisieren.")
  }
  return createResultError(op, "Scannerlink-Backend ist nicht erreichbar. Bitte später erneut versuchen.")
}
