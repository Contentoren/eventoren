import type { Browser, BrowserContext, Page } from "playwright"
import type { E2eCheckpoint } from "../../checkpoint/e2eCheckpointSchema.ts"

export type TicketPurchaseContext = {
  page: Page
  browser: Browser
  baseUrl: string
  directory: string
  checkpoint: E2eCheckpoint & { ticket: NonNullable<E2eCheckpoint["ticket"]> }
  mail: { host: string; port: number; user: string; password: string }
  guestContext?: BrowserContext
  checkoutPage?: Page
}
