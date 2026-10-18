import type { DashScannerLink } from "../../../model/dashScannerLinkSchema.ts"

export function dashScannerLinkUrl(link: DashScannerLink): string {
  return `https://eventoren.de/scanner/${link.token}`
}
