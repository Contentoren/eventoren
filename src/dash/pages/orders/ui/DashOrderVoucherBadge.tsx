import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { Show } from "solid-js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { CorvuPopoverIcon } from "#ui/interactive/popover/CorvuPopoverIcon.jsx"
import type { DashOrderVoucherUse } from "../../../model/dashOrderVoucherUseSchema.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { dashOrderVoucherBadgeStateCreate } from "./dashOrderVoucherBadgeStateCreate.ts"

/** Gutschein-Badge in der Bestellliste: Icon-Button mit Popover zu Code, eingelöstem Betrag, Restguthaben/Status und Detail-Link. */
export function DashOrderVoucherBadge(p: { voucher: DashOrderVoucherUse }) {
  const state = dashOrderVoucherBadgeStateCreate({
    voucher: () => p.voucher,
    vouchers: () => dashStateGet().vouchers,
    now: dashNow(),
  })

  return (
    <span class="inline-flex">
      <CorvuPopoverIcon
        icon={mdiGiftOutline}
        iconClass="size-4"
        title={state.tooltip()}
        aria-label={`Gutscheindetails ${state.code()} anzeigen`}
        variant="ghost"
        class="size-8 rounded-control p-1.5"
        innerClass="w-64 p-3"
        onClick={(event) => event.stopPropagation()}
      >
        <span class="flex flex-col gap-2 text-left text-sm">
          <span class="flex items-center justify-between gap-2">
            <span class="font-mono text-[13px] font-semibold">{state.code()}</span>
            <CopyButton value={state.code()} ariaLabel={`Code ${state.code()} kopieren`} />
          </span>
          <span class="flex items-center justify-between gap-2 text-content-muted">
            <span>Eingelöst</span>
            <span class="font-medium tabular-nums text-content">{state.amountText()}</span>
          </span>
          <Show
            when={state.detail() !== null}
            fallback={<span class="text-xs text-content-muted">Gutscheindetails nicht verfügbar.</span>}
          >
            <span class="flex items-center justify-between gap-2 text-content-muted">
              <span>Restguthaben</span>
              <span class="font-medium tabular-nums text-content">{state.balanceText()}</span>
            </span>
            <Show when={state.status()}>
              {(status) => (
                <span class="flex items-center justify-between gap-2 text-content-muted">
                  <span>Status</span>
                  <DashStatusPill kind="voucher" value={status()} size="sm" />
                </span>
              )}
            </Show>
          </Show>
          <Show when={state.linkSearch()}>
            {(search) => (
              <LinkButtonInternal
                to="/demo/dashboard/gutscheine"
                search={search()}
                variant="link"
                class="h-auto justify-start px-0 text-sm"
              >
                Gutschein ansehen
              </LinkButtonInternal>
            )}
          </Show>
        </span>
      </CorvuPopoverIcon>
    </span>
  )
}
