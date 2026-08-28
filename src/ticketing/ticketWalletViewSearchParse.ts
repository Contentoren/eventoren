import type { TicketWalletView } from "./TicketWalletView.ts"
import { ticketWalletViewLabels } from "./ticketWalletViewLabels.ts"

export function ticketWalletViewSearchParse(input: Record<string, unknown>): { ansicht?: TicketWalletView } {
  const raw = input.ansicht
  const isView = typeof raw === "string" && raw !== "wallet" && raw in ticketWalletViewLabels
  return { ansicht: isView ? (raw as TicketWalletView) : undefined }
}
