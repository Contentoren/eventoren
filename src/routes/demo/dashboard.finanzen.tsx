import { createFileRoute } from "@tanstack/solid-router"
import { demoRouteHeadCreate } from "../../demo/model/demoRouteHeadCreate.ts"
import { DashPageHeader } from "../../dash/ui/DashPageHeader.tsx"
import { DashFinancePage } from "../../dash/pages/finance/ui/DashFinancePage.tsx"

export const Route = createFileRoute("/demo/dashboard/finanzen")({
  head: () =>
    demoRouteHeadCreate(
      "Finanzen · Eventoren Demo",
      "Umsatz, Abrechnungen und Auszahlungen.",
      "/demo/dashboard/finanzen",
    ),
  component: () => (
    <div>
      <DashPageHeader title="Finanzen" description="Auszahlungen und Abrechnungen je Event." />
      <DashFinancePage />
    </div>
  ),
})
