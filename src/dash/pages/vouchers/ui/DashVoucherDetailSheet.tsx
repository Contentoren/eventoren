import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import type { DashVoucherValidity } from "../../../model/dashVoucherValiditySchema.ts"
import { dashVoucherValidityChange } from "../../../store/actions/vouchers/dashVoucherValidityChange.ts"
import { dashVoucherDeactivate } from "../../../store/actions/vouchers/dashVoucherDeactivate.ts"
import { dashVoucherPdf } from "../../../store/actions/vouchers/dashVoucherPdf.ts"
import { dashVoucherStatusResolve } from "../../../store/actions/vouchers/dashVoucherStatusResolve.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { DashDescriptionList } from "../../../ui/layout/DashDescriptionList.tsx"
import {
  dashVoucherExpiryLine,
  dashVoucherExpiryText,
  dashVoucherRecipientText,
  dashVoucherRedemptionText,
  dashVoucherValidityOptions,
} from "../dashVoucherText.ts"
import type { DashVouchersState } from "../DashVouchersStateCreate.ts"

/** Detail-Sheet eines Gutscheins: Übersicht, Einlösungen, Laufzeit ändern, Deaktivieren, PDF. */
export function DashVoucherDetailSheet(p: {
  open: boolean
  voucher: DashVoucher
  org: DashOrg
  orderNumberById: Map<string, string>
  canEdit: boolean
  state: DashVouchersState
  onOpenChange: (open: boolean) => void
}) {
  const now = dashNow()
  const resolved = () => dashVoucherStatusResolve(p.voucher, now())

  const customIso = (): string | null => {
    const raw = p.state.validityDate.get().trim()
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(raw)) return null
    const parsed = Date.parse(`${raw}T12:00:00.000Z`)
    return Number.isFinite(parsed) ? new Date(parsed).toISOString().slice(0, 10) : null
  }

  const saveValidity = () => {
    const validity = p.state.validityValue.get()
    const custom = validity === "datum" ? customIso() : null
    if (validity === "datum" && custom === null) {
      toastAdd({ title: "Bitte wähle ein Datum für „Gültig bis“.", variant: "error" })
      return
    }
    const result = dashVoucherValidityChange(p.voucher.id, validity, custom)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Laufzeit geändert: ${result.data}`, variant: "success" })
  }

  const deactivateConfirm = () => {
    const result = dashVoucherDeactivate(p.voucher.id)
    p.state.deactivateOpen.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Gutschein ${result.data} deaktiviert`, variant: "success" })
  }

  const downloadPdf = () => {
    void dashVoucherPdf(p.voucher, p.org).then((result) => {
      if (!result.success) {
        toastAdd({ title: result.errorMessage, variant: "error" })
        return
      }
      dashDownload(dashFileNameCreate(["Gutschein", p.voucher.code], "pdf", new Date()), result.data, "application/pdf")
      toastAdd({ title: "PDF heruntergeladen", variant: "success" })
    })
  }

  return (
    <>
      <Sheet
        open={p.open}
        onOpenChange={p.onOpenChange}
        size="lg"
        title={`Gutschein ${p.voucher.code}`}
        description={dashVoucherRecipientText(p.voucher)}
        headerActions={<DashStatusPill kind="voucher" value={resolved()} />}
        footer={
          <div class="flex w-full flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={downloadPdf}>
              PDF
            </Button>
            <Show when={p.canEdit && p.voucher.status !== "deaktiviert"}>
              <Button
                type="button"
                variant="outline"
                class="h-9 px-3 text-sm"
                onClick={() => p.state.deactivateOpen.set(true)}
              >
                Deaktivieren
              </Button>
            </Show>
          </div>
        }
      >
        <div class="flex flex-col gap-4">
          <div class="flex items-center gap-2">
            <span class="font-mono text-sm font-semibold">{p.voucher.code}</span>
            <CopyButton value={p.voucher.code} ariaLabel={`Code ${p.voucher.code} kopieren`} />
          </div>
          <DashDescriptionList
            items={[
              { label: "Empfänger", value: dashVoucherRecipientText(p.voucher) },
              { label: "E-Mail", value: p.voucher.recipientEmail.trim().length > 0 ? p.voucher.recipientEmail : "—" },
              {
                label: "Wert",
                value: (
                  <span class="tabular-nums">
                    <DashMoney cents={p.voucher.initialCents} />
                  </span>
                ),
              },
              {
                label: "Restguthaben",
                value: (
                  <span class="tabular-nums">
                    <DashMoney cents={p.voucher.balanceCents} />
                  </span>
                ),
              },
              { label: "Art", value: p.voucher.kind === "verkauft" ? "Verkauft" : "Kostenlos" },
              {
                label: "Ablauf",
                value: `${dashVoucherExpiryText(p.voucher)} · ${dashVoucherExpiryLine(p.voucher.expiresAt)}`,
              },
              {
                label: "Nachricht",
                value: p.voucher.message.trim().length > 0 ? p.voucher.message : "—",
              },
            ]}
          />
          <div>
            <p class="mb-1.5 text-sm font-semibold">Einlösungen ({p.voucher.redemptions.length})</p>
            <Show
              when={p.voucher.redemptions.length > 0}
              fallback={<p class="text-sm text-content-muted">Noch keine Einlösung.</p>}
            >
              <ul class="flex flex-col gap-1.5">
                <For each={[...p.voucher.redemptions].sort((a, b) => Date.parse(b.at) - Date.parse(a.at))}>
                  {(entry) => (
                    <li class="flex flex-wrap items-center justify-between gap-2 rounded-card border border-border-subtle px-3 py-2 text-sm">
                      <span class="font-medium">{p.orderNumberById.get(entry.orderId) ?? entry.orderId}</span>
                      <span class="text-content-muted">
                        {dashVoucherRedemptionText(
                          p.orderNumberById.get(entry.orderId) ?? entry.orderId,
                          entry.amountCents,
                          entry.at,
                        )
                          .split(" · ")
                          .slice(1)
                          .join(" · ")}
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
          <Show when={p.canEdit && p.voucher.status !== "deaktiviert"}>
            <DashField label="Laufzeit ändern">
              <div class="flex flex-col gap-2">
                <div class="flex flex-wrap gap-1.5" role="group" aria-label="Laufzeit wählen">
                  <For each={dashVoucherValidityOptions}>
                    {(option) => (
                      <FilterChip
                        active={p.state.validityValue.get() === option.value}
                        onClick={() => p.state.validityValue.set(option.value as DashVoucherValidity)}
                      >
                        {option.label}
                      </FilterChip>
                    )}
                  </For>
                </div>
                <Show when={p.state.validityValue.get() === "datum"}>
                  <Input
                    class="h-10 max-w-56 text-sm rounded-control"
                    type="date"
                    value={p.state.validityDate.get()}
                    onInput={(event) => p.state.validityDate.set(event.currentTarget.value)}
                    aria-label="Gültig bis Datum"
                  />
                </Show>
                <div>
                  <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={saveValidity}>
                    Laufzeit speichern
                  </Button>
                </div>
              </div>
            </DashField>
          </Show>
        </div>
      </Sheet>
      <ConfirmDialog
        open={p.state.deactivateOpen.get()}
        onOpenChange={(open) => p.state.deactivateOpen.set(open)}
        title={`Gutschein ${p.voucher.code} deaktivieren?`}
        description={`Restguthaben ${dashCentsFormat(p.voucher.balanceCents)} kann danach nicht mehr eingelöst werden.`}
        confirmLabel="Deaktivieren"
        tone="danger"
        onConfirm={deactivateConfirm}
      />
    </>
  )
}
