export function scannerLinkEventHrefCreate(code: string, eventKey: string): string {
  return `/scanner/${encodeURIComponent(code)}/event/${encodeURIComponent(eventKey)}`
}
