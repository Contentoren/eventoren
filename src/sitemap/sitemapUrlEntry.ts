export type SitemapUrlEntry = {
  readonly loc: string
  readonly lastmod?: string
  readonly changefreq: "daily" | "weekly" | "monthly" | "yearly"
  readonly priority: number
  /** `xhtml:link rel="alternate"` language versions of the URL, the URL itself included. */
  readonly alternates?: readonly { readonly hreflang: string; readonly href: string }[]
}
