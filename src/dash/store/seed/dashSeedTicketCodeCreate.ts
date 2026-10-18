/** Erzeugt einen Ticketcode T-XXXX-XXXX mit unverwechselbaren Zeichen. */
export function dashSeedTicketCodeCreate(random: () => number, taken: Set<string>): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  for (let guard = 0; guard < 1000; guard += 1) {
    let body = ""
    for (let position = 0; position < 8; position += 1) body += alphabet[Math.floor(random() * alphabet.length)]
    const code = `T-${body.slice(0, 4)}-${body.slice(4)}`
    if (!taken.has(code)) {
      taken.add(code)
      return code
    }
  }
  throw new Error("dashSeedTicketCodeCreate: keine freien Codes mehr")
}
