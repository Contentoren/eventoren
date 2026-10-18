import type { DashMdBlock } from "./dashMdBlock.ts"
import type { DashMdInline } from "./dashMdInline.ts"

function dashMarkdownLinkParse(source: string, start: number): { node: DashMdInline; next: number } | null {
  const closeBracket = source.indexOf("]", start + 1)
  if (closeBracket === -1 || source[closeBracket + 1] !== "(") return null
  const closeParen = source.indexOf(")", closeBracket + 2)
  if (closeParen === -1) return null
  const href = source.slice(closeBracket + 2, closeParen)
  if (!/^(https?:\/\/|mailto:)[^\s]+$/u.test(href)) return null
  const children = dashMarkdownInlinesParse(source.slice(start + 1, closeBracket))
  return { node: { type: "link", href, children }, next: closeParen + 1 }
}

function dashMarkdownUnderscoreIsBoundary(source: string, index: number, opening: boolean): boolean {
  const neighbor = opening ? source[index - 1] : source[index + 1]
  if (neighbor === undefined) return true
  return !/[\p{L}\p{N}]/u.test(neighbor)
}

function dashMarkdownInlinesParse(source: string): DashMdInline[] {
  const inlines: DashMdInline[] = []
  let text = ""
  const flush = () => {
    if (text) inlines.push({ type: "text", text })
    text = ""
  }
  let index = 0
  while (index < source.length) {
    const char = source[index]
    if (char === "\n") {
      flush()
      inlines.push({ type: "break" })
      index += 1
      continue
    }
    if (char === "*" && source[index + 1] === "*") {
      const end = source.indexOf("**", index + 2)
      if (end === -1) {
        text += "**"
        index += 2
        continue
      }
      flush()
      inlines.push({ type: "bold", children: dashMarkdownInlinesParse(source.slice(index + 2, end)) })
      index = end + 2
      continue
    }
    if (char === "*" || char === "_") {
      const isUnderscore = char === "_"
      const end = source.indexOf(char, index + 1)
      const boundary = !isUnderscore || dashMarkdownUnderscoreIsBoundary(source, index, true)
      if (end === -1 || end === index + 1 || !boundary) {
        text += char
        index += 1
        continue
      }
      flush()
      inlines.push({ type: "italic", children: dashMarkdownInlinesParse(source.slice(index + 1, end)) })
      index = end + 1
      continue
    }
    if (char === "[") {
      const link = dashMarkdownLinkParse(source, index)
      if (!link) {
        text += "["
        index += 1
        continue
      }
      flush()
      inlines.push(link.node)
      index = link.next
      continue
    }
    text += char
    index += 1
  }
  flush()
  return inlines
}

function dashMarkdownHeadingParse(line: string): DashMdBlock | null {
  if (line.startsWith("### ")) return { type: "heading", level: 3, inlines: dashMarkdownInlinesParse(line.slice(4)) }
  if (line.startsWith("## ")) return { type: "heading", level: 2, inlines: dashMarkdownInlinesParse(line.slice(3)) }
  if (line.startsWith("# ")) return { type: "heading", level: 2, inlines: dashMarkdownInlinesParse(line.slice(2)) }
  return null
}

function dashMarkdownListItemParse(line: string): { ordered: boolean; content: string } | null {
  const unordered = line.match(/^(?:[-*])\s+(.+)$/u)
  if (unordered?.[1] !== undefined) return { ordered: false, content: unordered[1] }
  const ordered = line.match(/^\d+\.\s+(.+)$/u)
  if (ordered?.[1] !== undefined) return { ordered: true, content: ordered[1] }
  return null
}

export function dashMarkdownParse(text: string): DashMdBlock[] {
  const blocks: DashMdBlock[] = []
  let paragraph: string[] = []
  let list: { ordered: boolean; items: DashMdInline[][] } | null = null
  const flushParagraph = () => {
    if (paragraph.length > 0)
      blocks.push({ type: "paragraph", inlines: dashMarkdownInlinesParse(paragraph.join("\n")) })
    paragraph = []
  }
  const flushList = () => {
    if (list) blocks.push({ type: "list", ordered: list.ordered, items: list.items })
    list = null
  }
  for (const line of text.replaceAll("\r\n", "\n").split("\n")) {
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    const heading = dashMarkdownHeadingParse(line)
    if (heading) {
      flushParagraph()
      flushList()
      blocks.push(heading)
      continue
    }
    const item = dashMarkdownListItemParse(line)
    if (item) {
      flushParagraph()
      if (!list || list.ordered !== item.ordered) {
        flushList()
        list = { ordered: item.ordered, items: [] }
      }
      list.items.push(dashMarkdownInlinesParse(item.content))
      continue
    }
    flushList()
    paragraph.push(line)
  }
  flushParagraph()
  flushList()
  return blocks
}
