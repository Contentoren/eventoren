import { For } from "solid-js"
import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiCheckDecagramOutline } from "@adaptive-ds/mdi/mdiCheckDecagramOutline.js"
import { mdiHistory } from "@adaptive-ds/mdi/mdiHistory.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashRelativeTime } from "../../../ui/time/DashRelativeTime.tsx"
import type { DashOverviewActivityItem } from "../model/dashOverviewActivityCreate.ts"
import { Icon } from "#ui/static/icon/Icon.jsx"

const kindIcon: Record<DashOverviewActivityItem["kind"], string> = {
  bestellung: mdiTicketConfirmationOutline,
  erstattung: mdiCashRefund,
  aktion: mdiHistory,
  checkin: mdiCheckDecagramOutline,
}

export function DashOverviewActivity(p: { items: DashOverviewActivityItem[] }) {
  return (
    <DashSection title="Aktivität">
      <ul class="flex flex-col">
        <For each={p.items}>
          {(item) => (
            <li class="flex items-start gap-3 border-b border-border-subtle py-2.5 text-sm last:border-0 last:pb-0 first:pt-0">
              <span class="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface-muted">
                <Icon path={kindIcon[item.kind]} class="size-4 text-content-muted" />
              </span>
              <div class="min-w-0 flex-1">
                <div class="flex items-baseline justify-between gap-2">
                  <span class="min-w-0 flex-1 truncate text-sm font-medium text-content">{item.title}</span>
                  <DashRelativeTime iso={item.at} class="shrink-0 text-xs whitespace-nowrap text-content-muted" />
                </div>
                <p class="mt-0.5 truncate text-xs text-content-muted">{item.detail}</p>
              </div>
            </li>
          )}
        </For>
      </ul>
    </DashSection>
  )
}
