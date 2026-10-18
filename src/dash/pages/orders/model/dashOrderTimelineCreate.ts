import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"

export type DashOrderTimelineKind =
  | "bestellt"
  | "bezahlt"
  | "email"
  | "checkin"
  | "erstattung"
  | "rueckbuchung"
  | "notiz"

export interface DashOrderTimelineEntry {
  kind: DashOrderTimelineKind
  at: string
  title: string
  detail: string | null
}

const emailLabel: Record<string, string> = {
  bestaetigung: "Bestätigung",
  rechnung: "Rechnung",
  tickets: "Tickets",
  erinnerung: "Erinnerung",
  storno: "Stornierung",
}

export function dashOrderTimelineCreate(args: { order: DashOrder; tickets: DashTicket[] }): DashOrderTimelineEntry[] {
  const { order, tickets } = args
  const entries: DashOrderTimelineEntry[] = [
    {
      kind: "bestellt",
      at: order.createdAt,
      title: "Bestellt",
      detail: `${order.channel === "online" ? "Online" : order.channel === "abendkasse" ? "Abendkasse" : "Gästeliste"} · ${order.buyer.email}`,
    },
  ]
  if (order.status !== "offen") {
    entries.push({ kind: "bezahlt", at: order.createdAt, title: "Bezahlt", detail: null })
  }
  for (const email of order.emails) {
    entries.push({
      kind: "email",
      at: email.at,
      title: `E-Mail „${emailLabel[email.kind] ?? email.kind}“ gesendet`,
      detail: email.to,
    })
  }
  for (const ticket of tickets.filter((entry) => entry.checkedInAt !== null)) {
    entries.push({
      kind: "checkin",
      at: ticket.checkedInAt ?? order.createdAt,
      title: `Eingecheckt (${ticket.holderName})`,
      detail: ticket.entrance ?? null,
    })
  }
  for (const refund of order.refunds) {
    const ticketText = refund.ticketIds.length === 1 ? "1 Ticket" : `${refund.ticketIds.length} Tickets`
    entries.push({
      kind: "erstattung",
      at: refund.at,
      title: `Erstattet (${refund.reason})`,
      detail: ticketText,
    })
  }
  if (order.chargeback) {
    entries.push({
      kind: "rueckbuchung",
      at: order.chargeback.at,
      title: "Rückbuchung",
      detail: "Chargeback über die Bank",
    })
  }
  for (const note of order.notes) {
    entries.push({ kind: "notiz", at: note.at, title: `Notiz von ${note.author}`, detail: note.text })
  }
  const rank: Record<DashOrderTimelineKind, number> = {
    bestellt: 0,
    bezahlt: 1,
    email: 2,
    checkin: 3,
    erstattung: 4,
    rueckbuchung: 5,
    notiz: 6,
  }
  return entries.sort((a, b) => Date.parse(a.at) - Date.parse(b.at) || rank[a.kind] - rank[b.kind])
}
