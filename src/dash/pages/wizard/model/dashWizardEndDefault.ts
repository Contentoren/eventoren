const wizardEndDefaultHours = 3

/** Ende-Default: leer oder ≤ Beginn → Beginn + 3 h, ein späteres Ende bleibt unverändert. */
export function dashWizardEndDefault(inputs: { startsAt: string | null; endsAt: string | null }): string | null {
  const startMs = inputs.startsAt ? Date.parse(inputs.startsAt) : Number.NaN
  if (!Number.isFinite(startMs)) return inputs.endsAt
  const endMs = inputs.endsAt ? Date.parse(inputs.endsAt) : Number.NaN
  if (!Number.isFinite(endMs) || endMs <= startMs) {
    return new Date(startMs + wizardEndDefaultHours * 3_600_000).toISOString()
  }
  return inputs.endsAt
}
