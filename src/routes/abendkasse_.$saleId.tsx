import { ClientOnly, createFileRoute } from "@tanstack/solid-router"
import { AbendkasseGastPage } from "#src/customer/boxoffice/AbendkasseGastPage.tsx"

export const Route = createFileRoute("/abendkasse_/$saleId")({
  head: () => ({
    meta: [{ title: "Abendkasse | Eventoren" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: GuestSaleRoute,
})
function GuestSaleRoute() {
  const params = Route.useParams()
  return (
    <ClientOnly fallback={<main class="p-4">Vorgang wird geladen …</main>}>
      <AbendkasseGastPage saleId={() => params().saleId} />
    </ClientOnly>
  )
}
