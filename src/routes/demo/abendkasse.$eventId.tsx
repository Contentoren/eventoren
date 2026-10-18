import * as v from "valibot"
import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { dashAbendkasseStateCreate } from "../../dash/public/abendkasse/dashAbendkasseStateCreate.ts"
import { DashAbendkasseView } from "../../dash/public/abendkasse/DashAbendkasseView.tsx"

export const Route = createFileRoute("/demo/abendkasse/$eventId")({
  validateSearch: (input: unknown): Record<string, unknown> => {
    const parsed = v.safeParse(v.object({ vorgang: v.optional(v.string()) }), (input ?? {}) as Record<string, unknown>)
    return parsed.success ? parsed.output : {}
  },
  head: () =>
    demoRouteHeadCreate(
      "Abendkasse-Demo",
      "Lokale Gast-Kaufseite der Abendkasse für das eigene Handy.",
      "/demo/abendkasse/ev-indie-night",
    ),
  component: AbendkasseRoute,
})

function AbendkasseRoute() {
  const params = Route.useParams()
  const search = Route.useSearch()
  const state = dashAbendkasseStateCreate({
    eventId: () => params().eventId,
    saleId: () => (search() as { vorgang?: string }).vorgang ?? null,
  })
  return (
    <ClientOnly
      fallback={
        <div class="flex min-h-dvh items-center justify-center bg-stone-50 text-slate-600">Abendkasse lädt …</div>
      }
    >
      <DashAbendkasseView state={state} eventId={params().eventId} />
    </ClientOnly>
  )
}
