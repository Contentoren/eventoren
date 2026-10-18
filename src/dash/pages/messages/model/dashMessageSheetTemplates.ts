import type { DashMessageKind } from "../../../model/dashMessageKindSchema.ts"

/** E-Mail-Vorlagen je Nachrichtenart, Platzhalter bleiben zur Vorschau erhalten. */
export const dashMessageSheetTemplates: Record<DashMessageKind, { subject: string; body: string }> = {
  info: { subject: "Neues zu {event}", body: "es gibt Neuigkeiten zu **{event}** am {datum}.\n\n" },
  aenderung: {
    subject: "Änderung bei {event}",
    body: "kleine Änderung bei **{event}** am {datum}: \n\nDein Ticket behält volle Gültigkeit.",
  },
  absage: {
    subject: "Absage: {event}",
    body: "leider müssen wir **{event}** am {datum} absagen. \n\nAlle Infos zur Erstattung bekommst du in einer separaten E-Mail.",
  },
  erinnerung: {
    subject: "Erinnerung: {event} am {datum}",
    body: "wir freuen uns auf dich bei **{event}** am {datum}.\n\nEinlass und alle Infos findest du in deinem Ticket.",
  },
}
