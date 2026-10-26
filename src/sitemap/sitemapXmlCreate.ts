import type { SitemapUrlEntry } from "./sitemapUrlEntry.ts"

/** Renders the sitemap XML of the given URL entries. */
export function sitemapXmlCreate(entries: readonly SitemapUrlEntry[]): string {
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    entries.map(sitemapUrlXmlCreate).join("\n") +
    "\n</urlset>\n"
  )
}

function sitemapUrlXmlCreate(entry: SitemapUrlEntry): string {
  const lines = [`    <loc>${sitemapXmlTextEscape(entry.loc)}</loc>`]
  if (entry.lastmod !== undefined) lines.push(`    <lastmod>${sitemapXmlTextEscape(entry.lastmod)}</lastmod>`)
  lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
  lines.push(`    <priority>${entry.priority}</priority>`)
  return `  <url>\n${lines.join("\n")}\n  </url>`
}

function sitemapXmlTextEscape(value: string): string {
  return value
    .replace(/&/gu, "&amp;")
    .replace(/</gu, "&lt;")
    .replace(/>/gu, "&gt;")
    .replace(/"/gu, "&quot;")
    .replace(/'/gu, "&apos;")
}
