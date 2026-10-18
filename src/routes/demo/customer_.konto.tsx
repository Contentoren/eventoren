import { ClientOnly, createFileRoute, useNavigate } from "@tanstack/solid-router"
import { DemoSiteFrame } from "../../demo/ui/DemoSiteFrame.tsx"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashAccountPage } from "../../dash/account/ui/DashAccountPage.tsx"
import { DashAccountSkeleton } from "../../dash/account/ui/DashAccountSkeleton.tsx"
import { dashAccountSearchParse } from "../../dash/account/model/dashAccountSearchParse.ts"
import type { DashAccountSearch } from "../../dash/account/model/dashAccountSearch.ts"

export const Route = createFileRoute("/demo/customer_/konto")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = dashAccountSearchParse(raw)
    const output: Record<string, unknown> = {}
    if (parsed.tab && parsed.tab !== "tickets") output["tab"] = parsed.tab
    if (parsed.ticket) output["ticket"] = parsed.ticket
    if (parsed.bestellung) output["bestellung"] = parsed.bestellung
    return output
  },
  head: () =>
    demoRouteHeadCreate(
      "Mein Konto · Eventoren Demo",
      "Deine Tickets, Bestellungen und dein Profil.",
      "/demo/customer/konto",
    ),
  component: () => (
    <DemoSiteFrame currentId="konto">
      <ClientOnly fallback={<DashAccountSkeleton />}>
        <DashAccountRoute />
      </ClientOnly>
    </DemoSiteFrame>
  ),
})

function DashAccountRoute() {
  const search = Route.useSearch()
  const navigate = useNavigate()

  const parsed = (): DashAccountSearch => dashAccountSearchParse(search() as Record<string, unknown>)
  const patch = (delta: Partial<DashAccountSearch>) => {
    const current: DashAccountSearch = { ...parsed(), ...delta }
    const next: Record<string, string> = {}
    if (current.tab && current.tab !== "tickets") next["tab"] = current.tab
    if (current.ticket) next["ticket"] = current.ticket
    if (current.bestellung) next["bestellung"] = current.bestellung
    void navigate({ to: "/demo/customer/konto", search: next, replace: true })
  }

  return (
    <DashAccountPage
      tab={parsed().tab ?? "tickets"}
      ticketId={parsed().ticket ?? null}
      orderId={parsed().bestellung ?? null}
      onTab={(tab) => patch({ tab, ticket: undefined, bestellung: undefined })}
      onTicket={(ticketId) => patch({ ticket: ticketId ?? undefined })}
      onOrder={(orderId) => patch({ bestellung: orderId ?? undefined })}
    />
  )
}
