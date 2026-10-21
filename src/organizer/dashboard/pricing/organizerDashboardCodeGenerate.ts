const organizerDashboardCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function organizerDashboardCodePrefixSanitize(prefix: string | undefined): string {
  return (prefix ?? "").toUpperCase().replaceAll(/[^A-Z0-9-]/gu, "")
}

/**
 * Generates human-readable bulk codes. Ambiguous characters (I, O, 0, 1) are
 * excluded so printed and scanned codes stay distinguishable.
 */
export function organizerDashboardCodeGenerate(options: {
  readonly prefix?: string | undefined
  readonly count: number
  readonly length?: number | undefined
  readonly existing?: readonly string[] | undefined
  readonly random: () => number
}): string[] {
  const normalizedPrefix = organizerDashboardCodePrefixSanitize(options.prefix)
  const bodyLength = options.length ?? 6
  const taken = new Set((options.existing ?? []).map((code) => code.toUpperCase()))
  const codes: string[] = []
  for (let index = 0; index < options.count; index += 1) {
    let candidate = ""
    let guard = 0
    do {
      let body = ""
      for (let position = 0; position < bodyLength; position += 1) {
        const slot = Math.floor(options.random() * organizerDashboardCodeAlphabet.length)
        body += organizerDashboardCodeAlphabet[slot] ?? "A"
      }
      candidate = `${normalizedPrefix}${body}`
      guard += 1
    } while (taken.has(candidate) && guard < 1000)
    if (taken.has(candidate)) continue
    taken.add(candidate)
    codes.push(candidate)
  }
  return codes
}
