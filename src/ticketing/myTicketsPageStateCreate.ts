import { getRouteApi } from "@tanstack/solid-router"
import { createMemo } from "solid-js"
import type { TicketWalletView } from "./TicketWalletView.ts"
import { ticketWalletViewLabels } from "./ticketWalletViewLabels.ts"

const routeApi = getRouteApi("/meine-tickets")

export function myTicketsPageStateCreate() {
  const search = routeApi.useSearch()
  const navigate = routeApi.useNavigate()

  const view = createMemo<TicketWalletView>(() => search().ansicht ?? "wallet")

  const viewOptions = createMemo(() =>
    (Object.keys(ticketWalletViewLabels) as TicketWalletView[]).map((value) => ({
      value,
      label: ticketWalletViewLabels[value],
    })),
  )

  const listClass = createMemo(() =>
    view() === "drucken"
      ? "rounded-card border border-border-strong bg-surface p-space-6 text-content [&_*]:break-inside-avoid"
      : "",
  )

  const hintLabel = createMemo(() =>
    view() === "drucken"
      ? "Druckansicht: Nutze die Druckfunktion deines Browsers, um alle Tickets auf Papier mitzunehmen."
      : "Deine Tickets liegen lokal auf diesem Gerät und funktionieren auch offline.",
  )

  const selectView = (next: TicketWalletView) => {
    navigate({
      to: "/meine-tickets",
      search: { ansicht: next === "wallet" ? undefined : next },
      replace: true,
      resetScroll: false,
    })
  }

  return { view, viewOptions, listClass, hintLabel, selectView }
}
