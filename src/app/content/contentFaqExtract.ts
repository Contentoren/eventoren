import { Parser, type Token } from "marked"
import type { ContentFaqItem } from "./ContentFaqItem.ts"
import { contentFaqHeadingIs } from "./contentFaqHeadingIs.ts"
import { contentMarkedRendererCreate } from "./contentMarkedRendererCreate.ts"
import { contentTokenTextRead } from "./contentTokenTextRead.ts"

/**
 * FAQ items from the `## Häufige Fragen` / `## Frequently asked questions` section:
 * each `### Question?` plus the following blocks up to the next `###` or `##`.
 */
export function contentFaqExtract(tokens: readonly Token[]): ContentFaqItem[] {
  const start = tokens.findIndex(
    (token) => token.type === "heading" && token.depth <= 2 && contentFaqHeadingIs(contentTokenTextRead(token.tokens)),
  )
  if (start === -1) return []

  const items: ContentFaqItem[] = []
  let question: string | undefined
  let answer: Token[] = []
  const flush = () => {
    if (question !== undefined && answer.length > 0) items.push(faqItemCreate(question, answer))
    question = undefined
    answer = []
  }

  for (const token of tokens.slice(start + 1)) {
    if (token.type === "heading" && token.depth <= 2) break
    if (token.type === "heading" && token.depth === 3) {
      flush()
      question = contentTokenTextRead(token.tokens)
      continue
    }
    if (token.type === "heading") {
      flush()
      continue
    }
    if (question !== undefined && token.type !== "space") answer.push(token)
  }
  flush()
  return items
}

function faqItemCreate(question: string, answer: Token[]): ContentFaqItem {
  const answerHtml = Parser.parse(answer, { renderer: contentMarkedRendererCreate() }).trim()
  return { question, answerHtml, answerText: contentTokenTextRead(answer) }
}
