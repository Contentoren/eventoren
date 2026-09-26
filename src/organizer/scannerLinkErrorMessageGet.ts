export function scannerLinkErrorMessageGet(message: string): string {
  if (message === "Link unavailable") return "Dieser Freigabelink ist ungültig, abgelaufen oder wurde widerrufen."
  if (message === "Event unavailable") return "Dieses Event ist über den Freigabelink nicht verfügbar."
  return "Der Freigabelink konnte nicht geprüft werden. Bitte versuche es erneut."
}
