import * as v from "valibot"
import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashKasseStateCreate } from "../../dash/public/kasse/dashKasseStateCreate.ts"
import { DashKasseView } from "../../dash/public/kasse/DashKasseView.tsx"

export const Route = createFileRoute("/demo/kasse/$eventId")({
  validateSearch: (input: unknown): { vorgang?: string } => {
    const raw = (input ?? {}) as Record<string, unknown>
    const parsed = v.safeParse(v.object({ vorgang: v.optional(v.string()) }), raw)
    const vorgang = parsed.success ? parsed.output.vorgang : undefined
    return typeof vorgang === "string" ? { vorgang } : {}
  },
  head: () =>
    demoRouteHeadCreate(
      "Kassenmodus-Demo",
      "Lokaler Kassenmodus für die Abendkasse am Eingang.",
      "/demo/kasse/ev-indie-night",
    ),
  component: KasseRoute,
})

function KasseRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const navigate = Route.useNavigate()
  const state = dashKasseStateCreate({
    eventId: () => params().eventId,
    saleId: () => search().vorgang ?? null,
    onSaleIdChange: (saleId) => {
      void navigate({
        to: "/demo/kasse/$eventId",
        params: { eventId: params().eventId },
        search: saleId ? { vorgang: saleId } : {},
        replace: true,
      })
    },
  })
  return (
    <ClientOnly
      fallback={<div class="flex min-h-dvh items-center justify-center bg-slate-950 text-white">Kasse lädt …</div>}
    >
      <DashKasseView state={state} eventId={params().eventId} />
    </ClientOnly>
  )
}
