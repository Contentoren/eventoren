export function ticketE2ePdfTextNormalize(text: string): string {
  return text
    .replace(/-\s+(?=[A-Za-z0-9])/gu, "-")
    .replace(/\s+/gu, " ")
    .trim()
}
