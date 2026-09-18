export function ticketOrderEmailAccessModeDetect(hash: string): boolean {
  return hash.startsWith("#ticketAccess=")
}
