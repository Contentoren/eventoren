import type { ContentHeading } from "./ContentHeading.ts"

/** Rendered article HTML plus its h2 table of contents. */
export type ContentArticleHtml = {
  readonly html: string
  readonly headings: readonly ContentHeading[]
  readonly publicPath: string
}
