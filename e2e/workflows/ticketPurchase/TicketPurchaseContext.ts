import type { Browser, BrowserContext, Page } from "playwright"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"
import type { BrowserErrorsCollector } from "../../config/BrowserErrorsCollector.ts"

export type TicketPurchaseContext = {
  page: Page
  browser: Browser
  baseUrl: string
  directory: string
  checkpoint: E2eCheckpoint & { ticket: NonNullable<E2eCheckpoint["ticket"]> }
  mail: { host: string; port: number; user: string; password: string }
  browserErrors: BrowserErrorsCollector
  guestContext?: BrowserContext
  checkoutPage?: Page
}
