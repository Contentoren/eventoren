export type SitemapUrlEntry = {
  readonly loc: string
  readonly lastmod?: string
  readonly changefreq: "daily" | "weekly" | "monthly" | "yearly"
  readonly priority: number
}
