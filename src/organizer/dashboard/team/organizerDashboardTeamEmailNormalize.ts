/**
 * Canonical form of an e-mail address for comparison and indexing.
 * Trims and lowercases; the account e-mail of a user is normalized the same way,
 * so invitation and account addresses can be compared without guessing.
 */
export function organizerDashboardTeamEmailNormalize(email: string): string {
  return email.trim().toLowerCase()
}
