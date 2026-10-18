type DashGuestBulkEntry = {
  name: string
  email: string
  line: number
}

type DashGuestBulkParsed = {
  entries: DashGuestBulkEntry[]
  errors: string[]
}

const dashGuestEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/**
 * Parst Gästelisten-Bulk-Text: eine Zeile je Gast als
 * „Name, E-Mail“, „Name;E-Mail“ oder nur „Name“.
 * Leere Zeilen werden übersprungen, ungültige E-Mails
 * werden als deutsche Fehlermeldung mit Zeilennummer gemeldet.
 */
export function dashGuestBulkParse(text: string): DashGuestBulkParsed {
  const entries: DashGuestBulkEntry[] = []
  const errors: string[] = []
  const lines = text.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1
    const raw = lines[index] ?? ""
    const trimmed = raw.trim()
    if (trimmed === "") continue
    const hasSemicolon = trimmed.includes(";")
    const hasComma = trimmed.includes(",")
    if (!hasSemicolon && !hasComma) {
      entries.push({ name: trimmed, email: "", line: lineNumber })
      continue
    }
    const parts = hasSemicolon ? trimmed.split(";") : trimmed.split(",")
    if (parts.length !== 2) {
      errors.push(`Zeile ${lineNumber}: Bitte nutze „Name, E-Mail“ mit genau einer E-Mail-Adresse.`)
      continue
    }
    const name = (parts[0] ?? "").trim()
    const email = (parts[1] ?? "").trim()
    if (name === "") {
      errors.push(`Zeile ${lineNumber}: Bitte gib einen Namen an.`)
      continue
    }
    if (email === "") {
      entries.push({ name, email: "", line: lineNumber })
      continue
    }
    if (!dashGuestEmailPattern.test(email)) {
      errors.push(`Zeile ${lineNumber}: „${email}“ ist keine gültige E-Mail-Adresse.`)
      continue
    }
    entries.push({ name, email, line: lineNumber })
  }
  return { entries, errors }
}
