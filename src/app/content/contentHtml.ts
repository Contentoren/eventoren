// Auto-generated from public/ratgeber/*.md by src/contentCompile.ts.
export type ContentHeading = {
  readonly id: string
  readonly text: string
  readonly depth: 1 | 2
}

export type ContentHtml = {
  readonly html: string
  readonly headings: readonly ContentHeading[]
  readonly publicPath: string
}

export const contentHtml: Readonly<Record<string, ContentHtml>> = {}
