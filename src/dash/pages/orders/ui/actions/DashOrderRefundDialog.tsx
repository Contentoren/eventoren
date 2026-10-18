import { mdiAlertCircleOutline } from "@adaptive-ds/mdi/mdiAlertCircleOutline.js"
import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiEmailOutline } from "@adaptive-ds/mdi/mdiEmailOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { ModalDialog } from "#ui/interactive/dialog/ModalDialog.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DashField } from "../../../../ui/layout/DashField.tsx"
import { DashMoney } from "../../../../ui/money/DashMoney.tsx"
import { DashMoneyInput } from "../../../../ui/form/DashMoneyInput.tsx"
import { dashCentsFormat } from "../../../../model/dashCentsFormat.ts"
import { dashOrderReasonOptions } from "../../model/dashOrderReasonOptions.ts"
import type { DashOrderRefundDialogState } from "./dashOrderRefundDialogStateCreate.ts"

/** Erstatten-Dialog (ModalDialog md, nested im Order-Sheet): Tickets- oder Betrag-Modus, Gebühren-Schalter, Grund, Folgen-Box. */
export function DashOrderRefundDialog(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  orderNumber: string
  state: DashOrderRefundDialogState
  ticketTypeName: (ticketTypeId: string) => string | null
  onSubmit: () => void
}) {
  const consequences = () => {
    const items = [
      { text: p.state.consequences().ticketLabel, icon: mdiTicketOutline },
      { text: `${p.state.consequences().amountLabel} werden erstattet`, icon: mdiCashRefund },
      { text: "Käufer bekommt eine E-Mail", icon: mdiEmailOutline },
    ]
    return items
  }

  return (
    <ModalDialog
      nested
      open={p.open}
      onOpenChange={(open) => {
        if (!open) p.state.error.set(null)
        p.onOpenChange(open)
      }}
      size="md"
      title="Erstatten"
      description={`Bestellung ${p.orderNumber}`}
      footer={
        <div class="flex w-full flex-wrap items-center justify-end gap-2">
          <Button
            type="button"
            variant={buttonVariant.outline}
            class="h-9 px-3 text-sm"
            onClick={() => p.onOpenChange(false)}
          >
            Abbrechen
          </Button>
          <Button
            type="button"
            variant={buttonVariant.filledRed}
            class="h-9 px-3 text-sm"
            disabled={!p.state.valid() || p.state.pending.get()}
            onClick={p.onSubmit}
          >
            {p.state.pending.get() ? "Wird erstattet …" : `${dashCentsFormat(p.state.totalCents())} erstatten`}
          </Button>
        </div>
      }
    >
      <div class="flex flex-col gap-4">
        <SegmentedControl
          value={p.state.mode.get()}
          onChange={(value) => p.state.mode.set(value === "betrag" ? "betrag" : "tickets")}
          options={[
            { value: "tickets", label: "Tickets" },
            { value: "betrag", label: "Betrag" },
          ]}
          ariaLabel="Erstattungsmodus wählen"
        />
        <Show when={p.state.mode.get() === "tickets"}>
          <fieldset>
            <legend class="text-sm font-medium">Welche Tickets erstatten?</legend>
            <ul class="mt-2 flex flex-col gap-2">
              <For each={p.state.refundableTickets()}>
                {(entry) => (
                  <li class="border border-border-subtle rounded-control px-3 py-2 text-sm">
                    <Checkbox
                      id={`dash-refund-${entry.ticket.id}`}
                      checked={p.state.selectedIds.get().includes(entry.ticket.id)}
                      onChange={() => p.state.toggleTicket(entry.ticket.id)}
                    >
                      <span class="flex flex-wrap items-baseline gap-x-2">
                        <span class="font-mono text-[13px]">{entry.ticket.code}</span>
                        <span class="text-content-muted">
                          {p.ticketTypeName(entry.ticket.ticketTypeId)} · {entry.ticket.holderName}
                        </span>
                        <span class="ml-auto font-medium tabular-nums">
                          <DashMoney cents={entry.amountCents} />
                        </span>
                      </span>
                    </Checkbox>
                  </li>
                )}
              </For>
            </ul>
            <Show when={p.state.invalidCount() > 0}>
              <p class="mt-1.5 text-xs text-content-muted">
                {p.state.invalidCount()} {p.state.invalidCount() === 1 ? "Ticket ist" : "Tickets sind"} bereits
                erstattet oder storniert.
              </p>
            </Show>
          </fieldset>
        </Show>
        <Show when={p.state.mode.get() === "betrag"}>
          <DashField
            label="Betrag"
            for="dash-refund-amount"
            hint={`max. ${dashCentsFormat(p.state.refundable().maxCents)}`}
            error={
              p.state.amountCents.get() !== null &&
              (p.state.amountCents.get() as number) > p.state.refundable().maxCents
                ? `Maximal ${dashCentsFormat(p.state.refundable().maxCents)} erstattbar`
                : null
            }
          >
            <DashMoneyInput
              id="dash-refund-amount"
              valueCents={p.state.amountCents.get()}
              onChange={(cents) => p.state.amountCents.set(cents)}
            />
          </DashField>
        </Show>
        <ToggleSwitch
          checked={p.state.includeFee.get()}
          onChange={(checked) => p.state.includeFee.set(checked)}
          disabled={!p.state.feeAvailable() || p.state.refundable().feeRefundableCents <= 0}
          label="Servicegebühr erstatten"
          description={
            p.state.refundable().feeRefundableCents > 0
              ? `${dashCentsFormat(p.state.refundable().feeRefundableCents)} · nur bei vollständiger Erstattung`
              : "Keine erstattbare Gebühr übrig"
          }
        />
        <Show when={p.state.mode.get() === "tickets"}>
          <ToggleSwitch
            checked={p.state.invalidateTickets.get()}
            onChange={(checked) => p.state.invalidateTickets.set(checked)}
            label="Tickets ungültig machen"
            description="Stornierte Tickets können nicht mehr eingelassen werden"
          />
        </Show>
        <fieldset>
          <legend class="text-sm font-medium">Grund</legend>
          <div class="mt-2 flex flex-wrap gap-2">
            <For each={dashOrderReasonOptions}>
              {(option) => (
                <FilterChip
                  active={p.state.reason.get() === option.value}
                  onClick={() => p.state.reason.set(option.value)}
                >
                  {option.label}
                </FilterChip>
              )}
            </For>
          </div>
        </fieldset>
        <Show when={p.state.reason.get() === "sonstiges"}>
          <DashField label="Anmerkung (optional)" for="dash-refund-note">
            <Input
              id="dash-refund-note"
              class="h-10 text-sm rounded-control"
              value={p.state.reasonNote.get()}
              onInput={(event) => p.state.reasonNote.set(event.currentTarget.value)}
              placeholder="z. B. Kulanz nach Verspätung"
            />
          </DashField>
        </Show>
        <ul aria-label="Folgen der Erstattung" class="space-y-1.5 rounded-control bg-surface-muted px-4 py-3 text-sm">
          <For each={consequences()}>
            {(item) => (
              <li class="flex items-center gap-2">
                <Icon path={item.icon} class="size-4 text-content-muted" />
                <span>{item.text}</span>
              </li>
            )}
          </For>
        </ul>
        <Show when={p.state.error.get()}>
          {(message) => (
            <p role="alert" class="flex items-center gap-1 text-xs text-danger">
              <Icon path={mdiAlertCircleOutline} class="size-3.5 shrink-0" />
              {message()}
            </p>
          )}
        </Show>
      </div>
    </ModalDialog>
  )
}
