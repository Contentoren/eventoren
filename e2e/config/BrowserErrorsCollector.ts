import type { BrowserContext } from "playwright"

export type BrowserErrorsCollector = {
  errors: string[]
  observe(context: BrowserContext): void
  dispose(): void
}
