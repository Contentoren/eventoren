const jsonLdEscapeMap: Readonly<Record<string, string>> = {
  "<": "\\u003c",
  ">": "\\u003e",
  "&": "\\u0026",
  "\u2028": "\\u2028",
  "\u2029": "\\u2029",
}

/**
 * JSON for an inline `<script type="application/ld+json">`. Escapes `<`, `>`, `&` and the JS line separators as
 * JSON unicode escapes (the same set as TanStack's `escapeHtml`), so a value like `</script>` cannot close the tag.
 */
export function seoJsonLdSerialize(value: unknown): string {
  return JSON.stringify(value).replace(/[<>&\u2028\u2029]/gu, (match) => jsonLdEscapeMap[match] ?? match)
}
