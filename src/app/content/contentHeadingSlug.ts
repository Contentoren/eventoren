/** Heading slug for fragment ids. German: ä→ae, ö→oe, ü→ue, ß→ss; `&` becomes "und" (de) or "and" (en). */
export function contentHeadingSlug(text: string, lang: "de" | "en" = "de"): string {
  const slug = text
    .toLowerCase()
    .replace(/ä/gu, "ae")
    .replace(/ö/gu, "oe")
    .replace(/ü/gu, "ue")
    .replace(/ß/gu, "ss")
    .replace(/&/gu, lang === "de" ? " und " : " and ")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/gu, "")
    .replace(/[^a-z0-9]+/gu, "-")
    .replace(/^-+|-+$/gu, "")
  return slug || (lang === "de" ? "abschnitt" : "section")
}
