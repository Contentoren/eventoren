import { onTestFinished } from "@rstest/core"
import { test } from "@rstest/playwright"
import type { BrowserErrorsCollector } from "./BrowserErrorsCollector.ts"
import { browserErrorsAssert } from "./browserErrorsAssert.ts"
import { browserErrorsObserve } from "./browserErrorsObserve.ts"

export const browserErrorsTest = test.extend<{ browserErrors: BrowserErrorsCollector }>({
  browserErrors: [
    async ({ context }, use) => {
      const cleanups: (() => void)[] = []
      const browserErrors: BrowserErrorsCollector = {
        errors: [],
        observe(observedContext) {
          cleanups.push(browserErrorsObserve(observedContext, browserErrors.errors))
        },
        dispose() {
          for (const cleanup of cleanups.splice(0)) cleanup()
        },
      }

      browserErrors.observe(context)
      onTestFinished(() => {
        browserErrors.dispose()
        browserErrorsAssert(browserErrors.errors)
      })
      await use(browserErrors)
    },
    { auto: true },
  ],
})
