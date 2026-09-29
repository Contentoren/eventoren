import type { BrowserContext, Page, WebError } from "playwright"

export function browserErrorsObserve(context: BrowserContext, errors: string[]): () => void {
  const pages = new Set<Page>()
  const pageErrorObserve = (error: Error): void => errors.push(`${error.name}: ${error.message}`)
  const pageObserve = (page: Page): void => {
    if (pages.has(page)) return
    pages.add(page)
    page.on("pageerror", pageErrorObserve)
  }
  const webErrorObserve = (webError: WebError): void => {
    const error = webError.error()
    errors.push(`${error.name}: ${error.message}`)
  }

  context.on("page", pageObserve)
  context.on("weberror", webErrorObserve)
  for (const page of context.pages()) pageObserve(page)

  return () => {
    context.off("page", pageObserve)
    context.off("weberror", webErrorObserve)
    for (const page of pages) page.off("pageerror", pageErrorObserve)
    pages.clear()
  }
}
