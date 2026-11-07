import type { Token } from "marked"

const blockTypes = new Set(["paragraph", "heading", "blockquote", "list_item", "code", "text", "space"])

/** Plain text of Markdown tokens, blocks separated by a space, whitespace collapsed. */
export function contentTokenTextRead(tokens: readonly Token[] | undefined): string {
  if (tokens === undefined) return ""
  return tokens.map(tokenText).join("").replace(/\s+/gu, " ").trim()
}

function tokenText(token: Token): string {
  if (token.type === "checkbox") return ""
  if (token.type === "list") return `${token.items.map(tokenText).join(" ")} `
  if (token.type === "table")
    return `${[token.header, ...token.rows]
      .flat()
      .map((cell: { text: string }) => cell.text)
      .join(" ")} `
  const separator = blockTypes.has(token.type) && token.type !== "text" ? " " : ""
  const nested = "tokens" in token ? token.tokens : undefined
  if (Array.isArray(nested)) return nested.map(tokenText).join("") + separator
  return ("text" in token && typeof token.text === "string" ? token.text : "") + separator
}
