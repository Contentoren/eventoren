import { For, Show } from "solid-js"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashVoucherExpiry } from "../../../model/dashVoucherExpiry.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import type { DashVoucherValidity } from "../../../model/dashVoucherValiditySchema.ts"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashVoucherCreate } from "../../../store/actions/vouchers/dashVoucherCreate.ts"
import { dashVoucherPdf } from "../../../store/actions/vouchers/dashVoucherPdf.ts"
import { dashVoucherSend } from "../../../store/actions/vouchers/dashVoucherSend.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashMoneyInput } from "../../../ui/form/DashMoneyInput.tsx"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashOrgLogo } from "../../../ui/org/DashOrgLogo.tsx"
import type { DashVoucherCreateSheetState } from "../DashVoucherCreateSheetState.ts"
import { dashVoucherExpiryLine, dashVoucherValidityOptions } from "../dashVoucherText.ts"

const valueChips = [1000, 2500, 5000, 10000]

function dashVoucherCustomDateIso(dateOnly: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(dateOnly)) return null
  const parsed = Date.parse(`${dateOnly}T12:00:00.000Z`)
  if (!Number.isFinite(parsed)) return null
  return new Date(parsed).toISOString().slice(0, 10)
}

/** Sheet „Gutschein erstellen“: Wert, Art, Empfänger, Laufzeit, Vorschau, danach PDF und E-Mail. */
export function DashVoucherCreateSheet(p: {
  open: boolean
  onOpenChange: (open: boolean) => void
  state: DashVoucherCreateSheetState
  created: DashVoucher | null
  onCreated: (voucher: DashVoucher) => void
  onClose: () => void
}) {
  const org = (): DashOrg | null => dashActiveOrg()

  const previewExpiresAt = (): string | null => {
    const validity = p.state.validity.get()
    const custom = validity === "datum" ? dashVoucherCustomDateIso(p.state.customDate.get()) : null
    if (validity === "datum" && custom === null) return null
    return dashVoucherExpiry(new Date().toISOString(), validity, custom)
  }

  const errors = (): string | null => {
    const cents = p.state.amountCents.get()
    if (cents === null || !Number.isInteger(cents) || cents < 100) return "Der Wert muss mindestens 1,00 € betragen."
    const email = p.state.recipientEmail.get().trim()
    if (email.length > 0 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(email)) return "Die E-Mail-Adresse sieht ungültig aus."
    const message = p.state.message.get()
    if (message.length > 300) return "Die Nachricht darf höchstens 300 Zeichen haben."
    if (p.state.validity.get() === "datum" && dashVoucherCustomDateIso(p.state.customDate.get()) === null)
      return "Bitte wähle ein Datum für „Gültig bis“."
    return null
  }

  const selectChip = (cents: number) => {
    p.state.chipAmount.set(cents)
    p.state.amountCents.set(cents)
  }

  const changeAmount = (cents: number | null) => {
    p.state.amountCents.set(cents)
    p.state.chipAmount.set(cents !== null && valueChips.includes(cents) ? cents : null)
  }

  const save = () => {
    p.state.showErrors.set(true)
    const error = errors()
    if (error) {
      toastAdd({ title: error, variant: "error" })
      return
    }
    const active = org()
    if (!active) {
      toastAdd({ title: "Keine Organisation aktiv.", variant: "error" })
      return
    }
    const custom = p.state.validity.get() === "datum" ? dashVoucherCustomDateIso(p.state.customDate.get()) : null
    const result = dashVoucherCreate({
      orgId: active.id,
      initialCents: p.state.amountCents.get() ?? 0,
      kind: p.state.kind.get(),
      recipientName: p.state.recipientName.get(),
      recipientEmail: p.state.recipientEmail.get(),
      message: p.state.message.get(),
      validity: p.state.validity.get(),
      customDate: custom,
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Gutschein ${result.data.code} erstellt`, variant: "success" })
    p.onCreated(result.data)
  }

  const downloadPdf = () => {
    const voucher = p.created
    const active = org()
    if (!voucher || !active) return
    void dashVoucherPdf(voucher, active).then((result) => {
      if (!result.success) {
        toastAdd({ title: result.errorMessage, variant: "error" })
        return
      }
      dashDownload(dashFileNameCreate(["Gutschein", voucher.code], "pdf", new Date()), result.data, "application/pdf")
      toastAdd({ title: "PDF heruntergeladen", variant: "success" })
    })
  }

  const sendEmail = () => {
    const voucher = p.created
    if (!voucher) return
    const result = dashVoucherSend(voucher.id)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Gutschein an ${result.data} gesendet`, variant: "success" })
  }

  const isNew = () => p.created === null

  return (
    <Sheet
      open={p.open}
      onOpenChange={p.onOpenChange}
      size="lg"
      title={isNew() ? "Gutschein erstellen" : `Gutschein ${p.created?.code ?? ""}`}
      description={isNew() ? "Wert, Empfänger und Laufzeit wählen." : "Herunterladen oder per E-Mail senden."}
    >
      <Show
        when={isNew()}
        fallback={
          <div class="flex flex-col gap-4">
            <DashVoucherPreviewCard
              org={org()}
              amountCents={p.created?.initialCents ?? 0}
              code={p.created?.code ?? ""}
              message={p.created?.message ?? ""}
              recipientName={p.created?.recipientName ?? ""}
            />
            <div class="flex flex-wrap gap-2">
              <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={downloadPdf}>
                PDF herunterladen
              </Button>
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={sendEmail}>
                Per E-Mail senden
              </Button>
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={p.onClose}>
                Schließen
              </Button>
            </div>
          </div>
        }
      >
        <div class="flex flex-col gap-4">
          <DashField label="Wert" required error={p.state.showErrors.get() ? errors() : undefined}>
            <div class="flex flex-col gap-2">
              <div class="flex flex-wrap gap-1.5" role="group" aria-label="Wert wählen">
                <For each={valueChips}>
                  {(cents) => (
                    <FilterChip active={p.state.chipAmount.get() === cents} onClick={() => selectChip(cents)}>
                      {dashCentsFormat(cents)}
                    </FilterChip>
                  )}
                </For>
              </div>
              <DashMoneyInput valueCents={p.state.amountCents.get()} onChange={changeAmount} />
            </div>
          </DashField>
          <DashField label="Art">
            <SegmentedControl
              value={p.state.kind.get()}
              onChange={(value) => p.state.kind.set(value as "verkauft" | "kostenlos")}
              options={[
                { value: "verkauft", label: "Verkauft" },
                { value: "kostenlos", label: "Kostenlos" },
              ]}
              ariaLabel="Gutscheinart"
            />
          </DashField>
          <div class="grid gap-4 sm:grid-cols-2">
            <DashField label="Empfänger Name">
              <Input
                class="h-10 text-sm rounded-control"
                value={p.state.recipientName.get()}
                onInput={(event) => p.state.recipientName.set(event.currentTarget.value)}
                placeholder="Mara Muster"
              />
            </DashField>
            <DashField label="Empfänger E-Mail">
              <Input
                class="h-10 text-sm rounded-control"
                type="email"
                value={p.state.recipientEmail.get()}
                onInput={(event) => p.state.recipientEmail.set(event.currentTarget.value)}
                placeholder="mara@example.de"
              />
            </DashField>
          </div>
          <DashField label="Persönliche Nachricht" hint={`${p.state.message.get().length} / 300 Zeichen`}>
            <Textarea
              value={p.state.message.get()}
              onInput={(event) => p.state.message.set(event.currentTarget.value.slice(0, 300))}
              placeholder="Viel Freude bei unseren Events!"
              rows={3}
            />
          </DashField>
          <DashField label="Laufzeit">
            <div class="flex flex-wrap gap-1.5" role="group" aria-label="Laufzeit wählen">
              <For each={dashVoucherValidityOptions}>
                {(option) => (
                  <FilterChip
                    active={p.state.validity.get() === option.value}
                    onClick={() => p.state.validity.set(option.value as DashVoucherValidity)}
                  >
                    {option.label}
                  </FilterChip>
                )}
              </For>
            </div>
          </DashField>
          <Show when={p.state.validity.get() === "datum"}>
            <DashField label="Gültig bis" required>
              <Input
                class="h-10 text-sm rounded-control"
                type="date"
                value={p.state.customDate.get()}
                onInput={(event) => p.state.customDate.set(event.currentTarget.value)}
              />
            </DashField>
          </Show>
          <p class="text-sm text-content-muted" aria-live="polite">
            {dashVoucherExpiryLine(
              p.state.validity.get() === "datum" && previewExpiresAt() === null ? null : previewExpiresAt(),
            )}
            <Show when={p.state.validity.get() === "datum" && previewExpiresAt() === null}>
              {" · Bitte Datum wählen"}
            </Show>
          </p>
          <div class="rounded-card border border-border-subtle bg-surface-muted/40 p-4">
            <p class="mb-2 text-sm font-semibold">Vorschau</p>
            <DashVoucherPreviewCard
              org={org()}
              amountCents={p.state.amountCents.get() ?? 0}
              code="GS-XXXXXXXX"
              message={p.state.message.get()}
              recipientName={p.state.recipientName.get()}
            />
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={p.onClose}>
              Abbrechen
            </Button>
            <Button type="button" variant="contrast" class="h-9 px-3 text-sm" onClick={save}>
              Gutschein erstellen
            </Button>
          </div>
        </div>
      </Show>
    </Sheet>
  )
}

/** Vorschau-Karte im Org-Stil: Verlauf, Logo, Betrag, Code, Nachricht. */
export function DashVoucherPreviewCard(p: {
  org: DashOrg | null
  amountCents: number
  code: string
  message: string
  recipientName: string
}) {
  return (
    <div class="overflow-hidden rounded-card border border-border-subtle bg-gradient-to-br from-violet-100 via-surface to-amber-50 dark:from-violet-950/40 dark:via-surface dark:to-amber-950/20">
      <div class="flex items-start justify-between gap-3 p-4">
        <div class="min-w-0">
          <p class="truncate text-sm font-semibold">{p.org?.name ?? "Deine Organisation"}</p>
          <p class="mt-0.5 text-2xl font-bold tabular-nums">
            <DashMoney cents={p.amountCents} />
          </p>
          <p class="mt-1 inline-flex items-center gap-1.5 font-mono text-sm font-semibold">
            <Icon path={mdiGiftOutline} class="size-4 text-content-muted" />
            {p.code}
            <Show when={p.code !== "GS-XXXXXXXX"}>
              <CopyButton value={p.code} ariaLabel={`Code ${p.code} kopieren`} />
            </Show>
          </p>
          <Show when={p.recipientName.trim().length > 0}>
            <p class="mt-1 truncate text-sm text-content-muted">Für {p.recipientName.trim()}</p>
          </Show>
          <Show when={p.message.trim().length > 0}>
            <p class="mt-1 line-clamp-2 text-sm text-content-muted">{p.message.trim()}</p>
          </Show>
        </div>
        <DashOrgLogo name={p.org?.name ?? "?"} logoDataUrl={p.org?.logoDataUrl ?? null} size="lg" />
      </div>
      <p class="border-t border-border-subtle bg-surface/60 px-4 py-2 text-xs text-content-muted">
        Einlösbar für alle Events von {p.org?.name ?? "deiner Organisation"}
      </p>
    </div>
  )
}
