import type { DashTicketForm } from "./dashTicketFormCreate.ts"

export type DashTicketFormErrors = {
  name?: string
  capacity?: string
  maxPerOrder?: string
  startAt?: string
  endAt?: string
  phasesGeneral?: string
  phaseNames: Record<string, string>
  phasePrices: Record<string, string>
  phaseEnds: Record<string, string>
}

function isBlank(value: string): boolean {
  return value.trim().length === 0
}

/** Reine Validierung des Ticketart-Formulars (kein Store-Zugriff außer sold für capacity). */
export function dashTicketFormValidate(form: DashTicketForm, sold: number): DashTicketFormErrors {
  const errors: DashTicketFormErrors = { phaseNames: {}, phasePrices: {}, phaseEnds: {} }
  if (isBlank(form.name.get())) errors.name = "Bitte gib einen Namen ein."
  const capacity = form.capacity.get()
  if (capacity === null || !Number.isInteger(capacity) || capacity < 0)
    errors.capacity = "Bitte gib ein Kontingent ab 0 ein."
  else if (capacity < sold) errors.capacity = `Schon ${sold} verkauft – das Kontingent darf nicht darunter liegen.`
  const maxPerOrder = form.maxPerOrder.get()
  if (maxPerOrder === null || !Number.isInteger(maxPerOrder) || maxPerOrder < 1)
    errors.maxPerOrder = "Bitte gib eine Zahl ab 1 ein."
  if (form.startMode.get() === "datum" && form.startAt.get() === null)
    errors.startAt = "Bitte gib ein Startdatum mit Uhrzeit ein."
  if (form.endMode.get() === "datum" && form.endAt.get() === null)
    errors.endAt = "Bitte gib ein Enddatum mit Uhrzeit ein."
  if (
    form.startMode.get() === "datum" &&
    form.endMode.get() === "datum" &&
    form.startAt.get() !== null &&
    form.endAt.get() !== null &&
    Date.parse(form.endAt.get() as string) <= Date.parse(form.startAt.get() as string)
  )
    errors.endAt = "Das Ende muss nach dem Start liegen."
  const phases = form.phases.get()
  if (phases.length === 0) errors.phasesGeneral = "Lege mindestens eine Preisphase an."
  let previousEnd: number | null = null
  for (const [position, phase] of phases.entries()) {
    if (isBlank(phase.name.get())) errors.phaseNames[phase.id] = "Name fehlt."
    const price = phase.priceCents.get()
    if (price === null || !Number.isInteger(price) || price < 0) errors.phasePrices[phase.id] = "Betrag ab 0 €."
    const endsAt = phase.endsAt.get()
    if (endsAt !== null && !Number.isFinite(Date.parse(endsAt))) errors.phaseEnds[phase.id] = "Ungültiges Datum."
    else if (endsAt !== null) {
      const time = Date.parse(endsAt)
      if (previousEnd !== null && time <= previousEnd) errors.phaseEnds[phase.id] = "Phasen müssen zeitlich aufsteigen."
      previousEnd = time
    }
  }
  return errors
}

/** true, wenn keine Fehlermeldung gesetzt ist. */
export function dashTicketFormIsValid(errors: DashTicketFormErrors): boolean {
  return (
    errors.name === undefined &&
    errors.capacity === undefined &&
    errors.maxPerOrder === undefined &&
    errors.startAt === undefined &&
    errors.endAt === undefined &&
    errors.phasesGeneral === undefined &&
    Object.keys(errors.phaseNames).length === 0 &&
    Object.keys(errors.phasePrices).length === 0 &&
    Object.keys(errors.phaseEnds).length === 0
  )
}
