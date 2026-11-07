/** Count words of a Markdown body, ignoring code, link targets, URLs and Markdown syntax. */
export function contentWordCount(markdown: string): number {
  const text = markdown
    .replace(/```[\s\S]*?```/gu, " ")
    .replace(/`[^`\n]*`/gu, " ")
    .replace(/!?\[([^\]]*)\]\([^)]*\)/gu, "$1")
    .replace(/<?https?:\/\/[^\s>)]+>?/gu, " ")
    .replace(/<[^>]+>/gu, " ")
  return text.split(/\s+/u).filter((word) => /[\p{L}\p{N}]/u.test(word)).length
}
