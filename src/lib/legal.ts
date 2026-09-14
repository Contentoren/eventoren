import { legalHtml } from "./legalHtml.js"

export type LegalPage = keyof typeof legalHtml

function htmlGet(page: LegalPage): string {
  return legalHtml[page]
}

export const legal = { htmlGet } as const
