/** Open Graph locale and schema.org `inLanguage` for a content language. */
export function seoLocaleRead(lang: "de" | "en"): { readonly ogLocale: string; readonly inLanguage: string } {
  if (lang === "en") return { ogLocale: "en_GB", inLanguage: "en-GB" }
  return { ogLocale: "de_DE", inLanguage: "de-DE" }
}
