import { Show } from "solid-js"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { UiBadge } from "../ui/UiBadge.tsx"
import type { AdminTicketOrderDetails } from "./AdminTicketOrderDetails.ts"
import type { AdminTicketOrderSummary } from "./AdminTicketOrderSummary.ts"
import type { AdminTicketOrdersPageState } from "./AdminTicketOrdersPageState.ts"
import { AdminTicketOrderDetailsPanel } from "./AdminTicketOrderDetailsPanel.tsx"
import { adminTicketOrderDrawerStateCreate } from "./adminTicketOrderDrawerStateCreate.ts"

export function AdminTicketOrderDrawer(p: {
  readonly open: boolean
  readonly onClose: () => void
  readonly details: AdminTicketOrderDetails | null
  readonly summary: AdminTicketOrderSummary | null
  readonly loading: boolean
  readonly error: string
  readonly dateFormat: (value: string) => string
  readonly priceFormat: (cents: number) => string
  readonly paymentLabel: AdminTicketOrdersPageState["paymentLabel"]
  readonly paymentTone: AdminTicketOrdersPageState["paymentTone"]
}) {
  const state = adminTicketOrderDrawerStateCreate({
    details: () => p.details,
    summary: () => p.summary,
    paymentLabel: p.paymentLabel,
    paymentTone: p.paymentTone,
  })

  return (
    <Sheet
      open={p.open}
      onOpenChange={(open) => {
        if (!open) p.onClose()
      }}
      size="lg"
      title={state.title()}
      description={state.description()}
      headerActions={
        <Show when={state.badge()}>{(badge) => <UiBadge tone={badge().tone}>{badge().label}</UiBadge>}</Show>
      }
    >
      <Show when={p.loading}>
        <p role="status" class="text-sm text-content-muted">
          Bestelldetails werden geladen …
        </p>
      </Show>
      <Show when={p.error}>
        <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
          {p.error}
        </p>
      </Show>
      <Show when={p.details}>
        {(details) => (
          <AdminTicketOrderDetailsPanel order={details()} dateFormat={p.dateFormat} priceFormat={p.priceFormat} />
        )}
      </Show>
    </Sheet>
  )
}
