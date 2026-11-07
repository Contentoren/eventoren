import type { SitemapUrlEntry } from "./sitemapUrlEntry.ts"

/** Renders the sitemap XML of the given URL entries. */
export function sitemapXmlCreate(entries: readonly SitemapUrlEntry[]): string {
  const hasAlternates = entries.some((entry) => (entry.alternates?.length ?? 0) > 0)
  const namespaces =
    'xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"' +
    (hasAlternates ? ' xmlns:xhtml="http://www.w3.org/1999/xhtml"' : "")
  return (
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
    `<urlset ${namespaces}>\n` +
    entries.map(sitemapUrlXmlCreate).join("\n") +
    "\n</urlset>\n"
  )
}

function sitemapUrlXmlCreate(entry: SitemapUrlEntry): string {
  const lines = [`    <loc>${sitemapXmlTextEscape(entry.loc)}</loc>`]
  if (entry.lastmod !== undefined) lines.push(`    <lastmod>${sitemapXmlTextEscape(entry.lastmod)}</lastmod>`)
  lines.push(`    <changefreq>${entry.changefreq}</changefreq>`)
  lines.push(`    <priority>${entry.priority}</priority>`)
  for (const alternate of entry.alternates ?? [])
    lines.push(
      `    <xhtml:link rel="alternate" hreflang="${sitemapXmlTextEscape(alternate.hreflang)}" href="${sitemapXmlTextEscape(alternate.href)}"/>`,
    )
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
