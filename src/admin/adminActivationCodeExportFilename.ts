const filenamePartSanitize = (value: string, fallback: string): string => {
  const cleaned = value
    .replaceAll("ß", "ss")
    .replaceAll("ẞ", "ss")
    .normalize("NFKD")
    .replaceAll(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, "-")
    .replaceAll(/^-+|-+$/g, "")
    .slice(0, 60)
    .replaceAll(/^-+|-+$/g, "")
  return cleaned.length > 0 ? cleaned : fallback
}

export function adminActivationCodeExportFilename(
  eventName: string,
  productName: string,
  extension: "csv" | "pdf",
): string {
  const eventPart = filenamePartSanitize(eventName, "event")
  const productPart = filenamePartSanitize(productName, "produkt")
  return `freischaltungscodes-${eventPart}-${productPart}.${extension}`
}
