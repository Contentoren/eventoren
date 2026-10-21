/** Normalizes a raw code entry to stored form: uppercase A–Z, 0–9 and dashes. */
export function organizerDashboardCodeNormalize(raw: string): string {
  return raw.toUpperCase().replaceAll(/[^A-Z0-9-]/gu, "")
}
