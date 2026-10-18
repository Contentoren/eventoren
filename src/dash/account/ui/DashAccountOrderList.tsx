import { For } from "solid-js"
import { DashMoney } from "../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import type { DashAccountOrderRow } from "../model/dashAccountOrderRow.ts"

export function DashAccountOrderList(p: { rows: DashAccountOrderRow[]; onOpen: (orderId: string) => void }) {
  return (
    <ul class="flex flex-col gap-3">
      <For each={p.rows}>
        {(row) => (
          <li>
            <span
              role="button"
              tabindex="0"
              onClick={() => p.onOpen(row.order.id)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") p.onOpen(row.order.id)
              }}
              class="flex w-full cursor-pointer flex-wrap items-center gap-x-4 gap-y-1 rounded-card border border-border-subtle bg-surface px-4 py-3 text-left hover:bg-surface-muted"
            >
              <span class="font-mono text-[13px] font-medium">{row.order.number}</span>
              <span class="min-w-0 flex-1 truncate text-sm">
                {row.eventTitle}
                <span class="text-content-muted"> · {dashDateFormat(row.order.createdAt, "datum")}</span>
              </span>
              <DashMoney cents={row.order.totalCents} class="text-sm font-semibold" />
              <DashStatusPill kind="order" value={row.order.status} />
            </span>
          </li>
        )}
      </For>
    </ul>
  )
}
