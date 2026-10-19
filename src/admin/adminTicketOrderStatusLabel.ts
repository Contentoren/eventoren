import type { AdminTicketOrderStatusFilter, AdminTicketOrderStatusKey } from "./adminTicketOrderStatusKey.ts"

const adminTicketOrderStatusLabels: Record<AdminTicketOrderStatusKey, string> = {
  bezahlt: "Bezahlt",
  offen: "Offen",
  sepa: "SEPA in Bearbeitung",
  fehlgeschlagen: "Fehlgeschlagen",
  abgelaufen: "Abgelaufen",
  storniert: "Storniert",
}

/** Chip-Label zum Status-Filter, ehrlich zu paymentLabel gemappt. */
export function adminTicketOrderStatusLabel(status: AdminTicketOrderStatusFilter): string {
  if (status === "alle") return "Alle"
  return adminTicketOrderStatusLabels[status]
}
