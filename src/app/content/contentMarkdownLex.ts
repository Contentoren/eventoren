import { Lexer, type Token } from "marked"

/** Tokenise an article body with GitHub-flavoured Markdown. */
export function contentMarkdownLex(markdown: string): Token[] {
  return Lexer.lex(markdown, { gfm: true })
}
