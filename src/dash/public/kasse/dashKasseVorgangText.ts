/** Baut den Banner-Text für offene Vorgänge an anderen Kassen (Einzahl/Mehrzahl). */
export function dashKasseVorgangText(open: number): string {
  if (open === 1) return "1 offener Vorgang an anderen Kassen"
  return `${open} offene Vorgänge an anderen Kassen`
}
