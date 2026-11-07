const faqHeadings = new Set(["häufige fragen", "frequently asked questions"])

/** True for the FAQ section heading text in German or English. */
export function contentFaqHeadingIs(text: string): boolean {
  return faqHeadings.has(text.trim().toLowerCase())
}
