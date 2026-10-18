import { mdiArrowDownRight } from "@adaptive-ds/mdi/mdiArrowDownRight.js"
import { mdiArrowUpRight } from "@adaptive-ds/mdi/mdiArrowUpRight.js"
import { mdiCartOutline } from "@adaptive-ds/mdi/mdiCartOutline.js"
import { mdiCashMultiple } from "@adaptive-ds/mdi/mdiCashMultiple.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { DashKpiCard } from "../../../ui/kpi/DashKpiCard.tsx"
import { Sparkline } from "#ui/chart/Sparkline.jsx"

export const overviewKpiIcons = { mdiArrowDownRight, mdiArrowUpRight }

export function DashOverviewKpis(p: {
  revenueCents: number
  revenueDelta: number | null
  revenueSpark: number[]
  tickets: number
  ticketsDelta: number | null
  ticketsSpark: number[]
  orders: number
  ordersDelta: number | null
  avgCents: number
  avgDelta: number | null
  showRevenue: boolean
  zeitraumLabel: string
}) {
  const revenueValue = () => dashCentsFormat(p.revenueCents, { compact: p.revenueCents >= 100_000_000 })
  return (
    <div class="grid grid-cols-2 items-stretch gap-3 lg:grid-cols-4">
      {p.showRevenue ? (
        <DashKpiCard
          label="Umsatz"
          value={revenueValue()}
          icon={mdiCashMultiple}
          delta={p.revenueDelta}
          deltaLabel={p.zeitraumLabel}
          href="/demo/dashboard/finanzen"
          chart={<Sparkline values={p.revenueSpark} tone="brand" height={36} />}
        />
      ) : null}
      <DashKpiCard
        label="Verkaufte Tickets"
        value={String(p.tickets)}
        icon={mdiTicketOutline}
        delta={p.showRevenue ? p.ticketsDelta : null}
        deltaLabel={p.showRevenue ? p.zeitraumLabel : undefined}
        href="/demo/dashboard/bestellungen"
        chart={<Sparkline values={p.ticketsSpark} tone="brand" height={36} />}
      />
      <DashKpiCard
        label="Bestellungen"
        value={String(p.orders)}
        icon={mdiCartOutline}
        delta={p.showRevenue ? p.ordersDelta : null}
        deltaLabel={p.showRevenue ? p.zeitraumLabel : undefined}
        href="/demo/dashboard/bestellungen"
      />
      {p.showRevenue ? (
        <DashKpiCard
          label="Ø Bestellwert"
          value={dashCentsFormat(p.avgCents)}
          icon={mdiReceiptTextOutline}
          delta={p.avgDelta}
          deltaLabel={p.zeitraumLabel}
          href="/demo/dashboard/finanzen"
        />
      ) : null}
    </div>
  )
}
