import type { DashMessage } from "../../model/dashMessageSchema.ts"
import type { DashMessageKind } from "../../model/dashMessageKindSchema.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"

export const dashMessageKindLabelMap: Record<DashMessageKind, string> = {
  info: "Info",
  aenderung: "Änderung",
  absage: "Absage",
  erinnerung: "Erinnerung",
}

/** Art-Label einer Nachricht (du sprichst). */
export function dashMessageKindLabel(kind: DashMessageKind): string {
  return dashMessageKindLabelMap[kind]
}

const dashMessageStatusLabel: Record<DashMessage["status"], string> = {
  entwurf: "Entwurf",
  geplant: "Geplant",
  gesendet: "Gesendet",
}

/** Einzeilige Meta-Zeile für Karten und Mobile (du sprichst). */
export function dashMessageMetaText(message: DashMessage): string {
  const status = dashMessageStatusLabel[message.status]
  const date = message.sentAt ?? message.scheduledAt
  const when = date ? ` · ${dashDateFormat(date, "datum")}` : ""
  return `${dashMessageKindLabel(message.kind)} · ${message.recipientCount} Empfänger · ${status}${when}`
}
