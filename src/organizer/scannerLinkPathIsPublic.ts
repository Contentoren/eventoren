export function scannerLinkPathIsPublic(pathname: string): boolean {
  return pathname.startsWith("/scanner/")
}
