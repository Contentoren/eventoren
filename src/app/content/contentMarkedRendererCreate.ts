import { Renderer, type Tokens } from "marked"
import type { ContentHeading } from "./ContentHeading.ts"
import { contentHeadingSlug } from "./contentHeadingSlug.ts"
import { contentLinkExternalIs } from "./contentLinkExternalIs.ts"
import { contentTokenTextRead } from "./contentTokenTextRead.ts"

/**
 * Article renderer: h1 is clamped to h2, h2 get unique slug ids collected into `headings`,
 * external links open in a new tab, tables scroll horizontally, task items render a disabled checkbox.
 */
export function contentMarkedRendererCreate(
  headings: ContentHeading[] = [],
  lang: "de" | "en" = "de",
): Renderer<string, string> {
  const renderer = new Renderer<string, string>()
  const usedIds = new Set<string>()

  renderer.heading = function heading({ tokens, depth }: Tokens.Heading) {
    const level = Math.min(Math.max(depth, 2), 6)
    const html = this.parser.parseInline(tokens)
    if (level !== 2) return `<h${level}>${html}</h${level}>\n`
    const text = contentTokenTextRead(tokens) || (lang === "de" ? "Abschnitt" : "Section")
    const id = headingIdUnique(contentHeadingSlug(text, lang), usedIds)
    headings.push({ id, text, depth: 2 })
    return `<h2 id="${id}">${html}</h2>\n`
  }

  renderer.html = ({ text }) => text.replace(/<h1(?=[\s>])/giu, "<h2").replace(/<\/h1\s*>/giu, "</h2>")

  renderer.link = function link(token: Tokens.Link) {
    const html = Renderer.prototype.link.call(this, token)
    if (!contentLinkExternalIs(token.href) || !html.startsWith("<a ")) return html
    return `<a rel="noopener" target="_blank" ${html.slice(3)}`
  }

  renderer.table = function table(token: Tokens.Table) {
    return `<div class="table-scroll">\n${Renderer.prototype.table.call(this, token)}</div>\n`
  }

  renderer.list = function list(token: Tokens.List) {
    const html = Renderer.prototype.list.call(this, token)
    if (!token.items.some((item) => item.task)) return html
    return html.replace(/^<(ul|ol)/u, '<$1 class="task-list"')
  }

  renderer.listitem = function listitem(item: Tokens.ListItem) {
    const html = Renderer.prototype.listitem.call(this, item)
    if (!item.task) return html
    return html.replace(/^<li>/u, '<li class="task-list-item">')
  }

  renderer.checkbox = ({ checked }: Tokens.Checkbox) => `<input type="checkbox" disabled${checked ? " checked" : ""}> `

  return renderer
}

function headingIdUnique(baseId: string, usedIds: Set<string>): string {
  let id = baseId
  let suffix = 2
  while (usedIds.has(id)) {
    id = `${baseId}-${suffix}`
    suffix += 1
  }
  usedIds.add(id)
  return id
}
