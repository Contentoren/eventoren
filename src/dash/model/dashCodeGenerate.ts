const dashCodeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

function dashCodeSanitizePrefix(prefix: string | undefined): string {
  return (prefix ?? "").toUpperCase().replaceAll(/[^A-Z0-9-]/gu, "")
}

export function dashCodeGenerate(options: {
  prefix?: string
  count: number
  length?: number
  existing?: string[]
  random: () => number
}): string[] {
  const opPrefix = dashCodeSanitizePrefix(options.prefix)
  const bodyLength = options.length ?? 6
  const taken = new Set((options.existing ?? []).map((code) => code.toUpperCase()))
  const codes: string[] = []
  for (let index = 0; index < options.count; index += 1) {
    let candidate = ""
    let guard = 0
    do {
      let body = ""
      for (let position = 0; position < bodyLength; position += 1) {
        const slot = Math.floor(options.random() * dashCodeAlphabet.length)
        body += dashCodeAlphabet[slot] ?? "A"
      }
      candidate = `${opPrefix}${body}`
      guard += 1
    } while (taken.has(candidate) && guard < 1000)
    if (taken.has(candidate)) continue
    taken.add(candidate)
    codes.push(candidate)
  }
  return codes
}
