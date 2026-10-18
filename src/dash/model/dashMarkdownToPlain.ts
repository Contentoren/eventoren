import type { DashMdInline } from "./dashMdInline.ts"
import { dashMarkdownParse } from "./dashMarkdownParse.ts"

function dashMarkdownInlineToPlain(inline: DashMdInline): string {
  if (inline.type === "text") return inline.text
  if (inline.type === "break") return " "
  return inline.children.map((child) => dashMarkdownInlineToPlain(child)).join("")
}

export function dashMarkdownToPlain(text: string): string {
  return dashMarkdownParse(text)
    .map((block) => {
      if (block.type === "list")
        return block.items.map((item) => item.map((inline) => dashMarkdownInlineToPlain(inline)).join("")).join(" ")
      return block.inlines.map((inline) => dashMarkdownInlineToPlain(inline)).join("")
    })
    .join(" ")
    .replaceAll(/\s+/gu, " ")
    .trim()
}
