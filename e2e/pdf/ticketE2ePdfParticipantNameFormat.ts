/** Match pdf-generator's Eventoren attendee field, not the full purchase/access-page value. */
export function ticketE2ePdfParticipantNameFormat(name: string): string {
  const characters = Array.from(name.trimStart())
  // The ticket renderer keeps names up to 40 characters, otherwise 13 plus an ellipsis.
  // Keep this explicit so a missing/wrong attendee still fails the PDF assertion.
  if (characters.length <= 40) return name
  return `${characters.slice(0, 13).join("").trimEnd()}…`
}
