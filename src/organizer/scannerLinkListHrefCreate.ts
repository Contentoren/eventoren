export function scannerLinkListHrefCreate(code: string): string {
  return `/scanner/${encodeURIComponent(code)}`
}
