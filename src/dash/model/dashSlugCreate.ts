export function dashSlugCreate(text: string, maxLength = 60): string {
  const umlauts = text
    .toLowerCase()
    .replaceAll("ä", "ae")
    .replaceAll("ö", "oe")
    .replaceAll("ü", "ue")
    .replaceAll("ß", "ss")
  const ascii = umlauts.normalize("NFD").replaceAll(/[\u0300-\u036f]/g, "")
  const dashed = ascii.replaceAll(/[^a-z0-9]+/g, "-").replaceAll(/^-+|-+$/g, "")
  return dashed.slice(0, maxLength).replace(/-+$/, "")
}
