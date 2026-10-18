const dashTeamEmailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type DashTeamEmailsParsed = {
  valid: string[]
  invalid: string[]
}

/** Parst E-Mail-Listen (Komma, Semikolon oder Zeilenumbruch getrennt); Duplikate fallen weg. */
export function dashTeamEmailsParse(text: string): DashTeamEmailsParsed {
  const valid: string[] = []
  const seen = new Set<string>()
  const invalid: string[] = []
  for (const part of text.split(/[,;\n\r]+/)) {
    const email = part.trim()
    if (email === "") continue
    const key = email.toLowerCase()
    if (seen.has(key)) continue
    seen.add(key)
    if (dashTeamEmailPattern.test(email)) valid.push(email)
    else invalid.push(email)
  }
  return { valid, invalid }
}
