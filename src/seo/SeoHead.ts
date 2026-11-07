type SeoHeadMeta = { title: string } | { name: string; content: string } | { property: string; content: string }

type SeoHeadLink = { rel: string; href: string; hreflang?: string }

type SeoHeadScript = { type: string; children: string }

/** TanStack route `head` result built by the SEO head builders: meta tags, links and JSON-LD scripts. */
export type SeoHead = {
  meta: SeoHeadMeta[]
  links: SeoHeadLink[]
  scripts: SeoHeadScript[]
}
