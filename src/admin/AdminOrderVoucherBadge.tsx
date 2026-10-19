import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { Show } from "solid-js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { CorvuPopoverIcon } from "#ui/interactive/popover/CorvuPopoverIcon.jsx"
import type { AdminOrderVoucherSnapshot } from "./adminOrderVoucherBadgeStateCreate.ts"
import { adminOrderVoucherBadgeStateCreate } from "./adminOrderVoucherBadgeStateCreate.ts"

/** Gutschein-Badge in der Admin-Bestellliste: Icon-Button mit Snapshot-Popover zu Code und eingelöstem Betrag. */
export function AdminOrderVoucherBadge(p: { voucher: AdminOrderVoucherSnapshot | null | undefined }) {
  return (
    <Show when={adminOrderVoucherBadgeStateCreate(p.voucher)}>
      {(state) => (
        <span class="inline-flex">
          <CorvuPopoverIcon
            icon={mdiGiftOutline}
            iconClass="size-4"
            title={state().tooltip}
            aria-label={`Gutscheindetails ${p.voucher?.code ?? ""} anzeigen`}
            variant="ghost"
            class="size-8 rounded-control p-1.5"
            innerClass="w-64 p-3"
            onClick={(event) => event.stopPropagation()}
          >
            <span class="flex flex-col gap-2 text-left text-sm">
              <span class="flex items-center justify-between gap-2">
                <span class="font-mono text-[13px] font-semibold">{p.voucher?.code ?? ""}</span>
                <CopyButton value={p.voucher?.code ?? ""} ariaLabel={`Code ${p.voucher?.code ?? ""} kopieren`} />
              </span>
              <span class="flex items-center justify-between gap-2 text-content-muted">
                <span>Eingelöst</span>
                <span class="font-medium tabular-nums text-content">{state().amountText}</span>
              </span>
            </span>
          </CorvuPopoverIcon>
        </span>
      )}
    </Show>
  )
}
