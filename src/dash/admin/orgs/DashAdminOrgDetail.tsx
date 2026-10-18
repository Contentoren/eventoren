import { For, Show, createEffect, createMemo } from "solid-js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashFeePayer } from "../../model/dashFeePayerSchema.ts"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashEventPhaseGet } from "../../model/dashEventPhaseGet.ts"
import { dashEventStats } from "../../model/dashEventStats.ts"
import { dashFeeCompute } from "../../model/dashFeeCompute.ts"
import { dashIbanMask } from "../../model/dashIbanMask.ts"
import { dashRoleLabel } from "../../model/dashRoleLabel.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashOrgStats } from "../../model/dashOrgStats.ts"
import { dashAdminOrgApprove } from "../../store/actions/admin/dashAdminOrgApprove.ts"
import { dashAdminOrgBlock } from "../../store/actions/admin/dashAdminOrgBlock.ts"
import { dashAdminOrgFeeUpdate } from "../../store/actions/admin/dashAdminOrgFeeUpdate.ts"
import { dashAdminOrgTaxUpdate } from "../../store/actions/admin/dashAdminOrgTaxUpdate.ts"
import { dashAdminOrgUnblock } from "../../store/actions/admin/dashAdminOrgUnblock.ts"
import type { DashTaxRate } from "../../model/dashTaxRateSchema.ts"
import type { DashTaxStatus } from "../../model/dashTaxStatusSchema.ts"
import { DashMoney } from "../../ui/money/DashMoney.tsx"
import { DashOrgLogo } from "../../ui/org/DashOrgLogo.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import { DashDescriptionList } from "../../ui/layout/DashDescriptionList.tsx"
import { DashField } from "../../ui/layout/DashField.tsx"
import { DashSection } from "../../ui/layout/DashSection.tsx"
import { DashMoneyInput } from "../../ui/form/DashMoneyInput.tsx"
import { dashMoneyStateCreate } from "../../ui/money/dashMoneyStateCreate.ts"
import { dashAdminOrgDetailStateCreate } from "./dashAdminOrgDetailStateCreate.ts"
import { dashOrgKindLabel } from "./dashAdminOrgsStateCreate.ts"

const feeExampleCents = 2500

/** Admin-Detail einer Organisation: Kopf mit Aktionen plus Karten für Gebühr, Steuern, Angaben, Verträge, Team und Events. */
export function DashAdminOrgDetail(p: { orgId: () => string }) {
  const state = dashAdminOrgDetailStateCreate({ orgId: p.orgId })
  const now = dashNow()

  const org = () => state.org()

  createEffect(() => {
    state.seed()
  })

  const stats = createMemo(() => {
    const current = org()
    if (!current) return null
    return dashOrgStats({ state: dashStateGet(), orgId: current.id, range: 30, now: now() })
  })

  const feeExample = createMemo(() => {
    const current = org()
    if (!current) return `Ticket ${dashCentsFormat(feeExampleCents)} · Gebühr —`
    const parsed = state.percentDraft.get().trim().replace(/\s/gu, "").replace(",", ".")
    const bps = /^\d+(?:\.\d{1,2})?$/u.test(parsed) ? Math.round(Number(parsed) * 100) : current.fee.percentBps
    const fixed = state.fixedDraft.get() ?? current.fee.fixedCents
    const computed = dashFeeCompute({
      priceCents: feeExampleCents,
      fee: { percentBps: bps, fixedCents: fixed, payer: state.payerDraft.get() },
    })
    return `Ticket ${dashCentsFormat(feeExampleCents)} · Gebühr ${dashCentsFormat(computed.feeCents)} · Käufer zahlt ${dashCentsFormat(computed.buyerPaysCents)} · Veranstalter erhält ${dashCentsFormat(computed.organizerGetsCents)}`
  })

  const saveFee = () => {
    const current = org()
    if (!current) return
    const error = state.feeError()
    if (error) {
      toastAdd({ title: error, variant: "error" })
      return
    }
    const parsed = state.percentDraft.get().trim().replace(/\s/gu, "").replace(",", ".")
    const result = dashAdminOrgFeeUpdate({
      orgId: current.id,
      percentBps: Math.round(Number(parsed) * 100),
      fixedCents: state.fixedDraft.get() ?? 0,
      payer: state.payerDraft.get(),
    })
    if (result.success) toastAdd({ title: "Gebührenmodell gespeichert", variant: "success" })
    else toastAdd({ title: result.errorMessage, variant: "error" })
  }

  const saveTax = () => {
    const current = org()
    if (!current) return
    const result = dashAdminOrgTaxUpdate({
      orgId: current.id,
      status: state.taxStatusDraft.get(),
      defaultRateBps: state.taxRateDraft.get(),
    })
    if (result.success) toastAdd({ title: "Steuern gespeichert", variant: "success" })
    else toastAdd({ title: result.errorMessage, variant: "error" })
  }

  const approve = () => {
    const current = org()
    if (!current) return
    const result = dashAdminOrgApprove(current.id)
    if (result.success) toastAdd({ title: "Organisation freigegeben", variant: "success" })
    else toastAdd({ title: result.errorMessage, variant: "error" })
  }

  const unblock = () => {
    const current = org()
    if (!current) return
    const result = dashAdminOrgUnblock(current.id)
    if (result.success) toastAdd({ title: "Sperrung aufgehoben", variant: "success" })
    else toastAdd({ title: result.errorMessage, variant: "error" })
  }

  const confirmBlock = () => {
    const current = org()
    if (!current) return
    const result = dashAdminOrgBlock(current.id, state.blockReason.get())
    if (result.success) {
      state.blockOpen.set(false)
      state.blockReason.set("")
      toastAdd({ title: "Organisation gesperrt", variant: "success" })
    } else {
      toastAdd({ title: result.errorMessage, variant: "error" })
    }
  }

  const members = createMemo(() => {
    const current = org()
    if (!current) return []
    return dashStateGet()
      .members.filter((member) => member.orgId === current.id)
      .sort((left, right) => left.name.localeCompare(right.name, "de"))
  })

  const events = createMemo(() => {
    const current = org()
    if (!current) return []
    const snapshot = dashStateGet()
    const currentNow = now()
    return snapshot.events
      .filter((event) => event.orgId === current.id)
      .sort((left, right) => Date.parse(right.startsAt) - Date.parse(left.startsAt))
      .map((event) => {
        const eventStats = dashEventStats({ state: snapshot, eventId: event.id, now: currentNow })
        return {
          event,
          phase: dashEventPhaseGet({ event, sold: eventStats.sold, capacity: eventStats.capacity, now: currentNow }),
        }
      })
  })

  const money = dashMoneyStateCreate({ cents: () => stats()?.revenueCents ?? 0, signed: () => false })

  const termsAt = (): string | null => org()?.termsAcceptedAt ?? null
  const dpaAt = (): string | null => org()?.dpaAcceptedAt ?? null
  const termsAcceptedLabel = (): string =>
    termsAt() === null ? "fehlt" : `Angenommen am ${dashDateFormat(termsAt() as string, "datum")}`
  const dpaAcceptedLabel = (): string =>
    dpaAt() === null ? "fehlt" : `Angenommen am ${dashDateFormat(dpaAt() as string, "datum")}`

  return (
    <Show
      when={org()}
      fallback={
        <DashSection title="Organisation nicht gefunden">
          <p class="text-sm text-content-muted">Diese Organisation existiert in der Demo nicht.</p>
        </DashSection>
      }
    >
      {(current) => (
        <div class="flex flex-col gap-4">
          <header class="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
            <div class="flex flex-wrap items-start justify-between gap-4">
              <div class="flex min-w-0 items-center gap-3">
                <DashOrgLogo name={current().name} logoDataUrl={current().logoDataUrl} size="lg" />
                <div class="min-w-0">
                  <h1 class="truncate text-xl font-semibold tracking-tight text-content">{current().name}</h1>
                  <p class="mt-0.5 truncate text-sm text-content-muted">
                    {dashOrgKindLabel(current().kind)} · /{current().slug} · Umsatz 30 Tage: {money.text()}
                  </p>
                  <div class="mt-2">
                    <DashStatusPill kind="org" value={current().status} />
                  </div>
                  <Show when={current().status === "gesperrt" && current().statusReason !== ""}>
                    <p class="mt-1 text-sm text-content-muted">Grund: {current().statusReason}</p>
                  </Show>
                </div>
              </div>
              <div class="flex shrink-0 flex-wrap gap-2">
                <Show when={current().status === "pruefung"}>
                  <Button variant={buttonVariant.contrast} class="h-9 px-3 text-sm" onClick={approve}>
                    <Icon path={mdiCheck} class="mr-2 size-4" />
                    Freigeben
                  </Button>
                </Show>
                <Show when={current().status !== "gesperrt"}>
                  <Button
                    variant={buttonVariant.filledRed}
                    class="h-9 px-3 text-sm"
                    onClick={() => state.blockOpen.set(true)}
                  >
                    Sperren
                  </Button>
                </Show>
                <Show when={current().status === "gesperrt"}>
                  <Button variant={buttonVariant.contrast} class="h-9 px-3 text-sm" onClick={unblock}>
                    Entsperren
                  </Button>
                </Show>
                <LinkButtonInternal
                  to="/demo/customer/veranstalter/$orgSlug"
                  params={{ orgSlug: current().slug }}
                  target="_blank"
                  rel="noreferrer"
                  variant="outline"
                  class="h-9 px-3 text-sm"
                >
                  Profil ansehen
                  <Icon path={mdiOpenInNew} class="ml-2 size-4" />
                </LinkButtonInternal>
              </div>
            </div>
          </header>

          <div class="grid gap-4 lg:grid-cols-2">
            <DashSection
              title="Gebührenmodell"
              description="Prozent, Fixbetrag und Zahler der Servicegebühr."
              footer={<span class="text-sm">{feeExample()}</span>}
            >
              <div class="grid gap-4 sm:grid-cols-2">
                <DashField label="Prozent" for="dash-admin-fee-percent" error={state.feeError()}>
                  <div class="relative">
                    <Input
                      id="dash-admin-fee-percent"
                      type="text"
                      inputmode="decimal"
                      value={state.percentDraft.get()}
                      onInput={(event) => state.percentDraft.set(event.currentTarget.value)}
                      placeholder="5"
                      aria-invalid={state.feeError() ? "true" : undefined}
                      class="h-10 pr-8 text-sm tabular-nums rounded-control"
                    />
                    <span
                      aria-hidden="true"
                      class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-content-muted"
                    >
                      %
                    </span>
                  </div>
                </DashField>
                <DashField label="Fixbetrag">
                  <DashMoneyInput valueCents={state.fixedDraft.get()} onChange={state.fixedDraft.set} />
                </DashField>
                <div class="sm:col-span-2">
                  <DashField label="Gebührenträger">
                    <SegmentedControl
                      value={state.payerDraft.get()}
                      onChange={(value) => state.payerDraft.set(value as DashFeePayer)}
                      options={[
                        { value: "kaeufer", label: "Käufer" },
                        { value: "veranstalter", label: "Veranstalter" },
                      ]}
                      ariaLabel="Gebührenträger"
                    />
                  </DashField>
                </div>
                <div class="sm:col-span-2">
                  <Button
                    variant={buttonVariant.outline}
                    class="h-9 px-3 text-sm"
                    disabled={!state.feeDirty() || state.feeError() !== null}
                    onClick={saveFee}
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            </DashSection>

            <DashSection title="Steuern" description="Besteuerung und Standardsteuersatz.">
              <div class="flex flex-col gap-4">
                <DashField label="Besteuerung">
                  <SegmentedControl
                    value={state.taxStatusDraft.get()}
                    onChange={(value) => state.taxStatusDraft.set(value as DashTaxStatus)}
                    options={[
                      { value: "regel", label: "Regelbesteuerung" },
                      { value: "klein", label: "Kleinunternehmer (§ 19)" },
                    ]}
                    ariaLabel="Besteuerung"
                  />
                </DashField>
                <DashField label="Standardsteuersatz">
                  <SegmentedControl
                    value={String(state.taxRateDraft.get())}
                    onChange={(value) => state.taxRateDraft.set(Number(value) as DashTaxRate)}
                    options={[
                      { value: "1900", label: "19 %" },
                      { value: "700", label: "7 %" },
                    ]}
                    ariaLabel="Standardsteuersatz"
                  />
                </DashField>
                <div>
                  <Button
                    variant={buttonVariant.outline}
                    class="h-9 px-3 text-sm"
                    disabled={!state.taxDirty()}
                    onClick={saveTax}
                  >
                    Speichern
                  </Button>
                </div>
              </div>
            </DashSection>

            <DashSection title="Angaben" description="Impressum, Kontakt und Bankverbindung.">
              <DashDescriptionList
                columns={2}
                items={[
                  { label: "Name", value: current().imprint.legalName },
                  { label: "Vertretung", value: current().imprint.representative },
                  {
                    label: "Adresse",
                    value: `${current().imprint.street}, ${current().imprint.zip} ${current().imprint.city}`,
                  },
                  { label: "Register", value: current().imprint.register || "—" },
                  { label: "USt-ID", value: current().imprint.vatId || "—" },
                  { label: "E-Mail", value: current().email },
                  { label: "Telefon", value: current().phone },
                  { label: "Website", value: current().website },
                  { label: "Kontoinhaber", value: current().bank.holder },
                  { label: "IBAN", value: dashIbanMask(current().bank.iban), mono: true },
                ]}
              />
            </DashSection>

            <DashSection title="Verträge" description="Annahme von AGB und AVV.">
              <DashDescriptionList
                items={[
                  {
                    label: "AGB für Veranstalter",
                    value: termsAcceptedLabel(),
                  },
                  {
                    label: "Auftragsverarbeitungsvertrag (AVV)",
                    value: dpaAcceptedLabel(),
                  },
                ]}
              />
            </DashSection>

            <DashSection
              title="Team"
              description={`${members().length} ${members().length === 1 ? "Mitglied" : "Mitglieder"}`}
            >
              <ul class="flex flex-col divide-y divide-border-subtle">
                <For each={members()}>
                  {(member) => (
                    <li class="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-content">{member.name}</span>
                        <span class="block truncate text-xs text-content-muted">{member.email}</span>
                      </span>
                      <span class="flex shrink-0 items-center gap-2">
                        <span class="text-xs text-content-muted">{dashRoleLabel(member.role).label}</span>
                        <DashStatusPill kind="member" value={member.status} size="sm" />
                      </span>
                    </li>
                  )}
                </For>
              </ul>
            </DashSection>

            <DashSection
              title="Events"
              description={`${events().length} ${events().length === 1 ? "Event" : "Events"}`}
            >
              <ul class="flex flex-col divide-y divide-border-subtle">
                <For each={events()}>
                  {(row) => (
                    <li class="flex items-center justify-between gap-2 py-2 first:pt-0 last:pb-0">
                      <span class="min-w-0">
                        <span class="block truncate text-sm font-medium text-content">{row.event.title}</span>
                        <span class="block truncate text-xs text-content-muted">
                          {dashDateFormat(row.event.startsAt, "datum")} · {row.event.venue.city || row.event.venue.name}
                        </span>
                      </span>
                      <DashStatusPill kind="event" value={row.phase} size="sm" />
                    </li>
                  )}
                </For>
              </ul>
              <Show when={events().length === 0}>
                <p class="text-sm text-content-muted">Keine Events vorhanden.</p>
              </Show>
            </DashSection>
          </div>

          <ConfirmDialog
            open={state.blockOpen.get()}
            onOpenChange={state.blockOpen.set}
            title="Organisation sperren"
            description={`„${current().name}“ wird für Gäste und Team gesperrt. Ein Grund ist erforderlich und erscheint im Protokoll.`}
            confirmLabel="Sperren"
            tone="danger"
            onConfirm={confirmBlock}
          >
            <div class="mt-3">
              <DashField label="Sperrgrund" for="dash-admin-block-reason" required>
                <Textarea
                  id="dash-admin-block-reason"
                  value={state.blockReason.get()}
                  onInput={(event) => state.blockReason.set(event.currentTarget.value)}
                  placeholder="z. B. Verstoß gegen die Nutzungsbedingungen"
                  rows={3}
                />
              </DashField>
              <Show when={state.blockReason.get().trim() === ""}>
                <p class="mt-1 text-xs text-content-muted">Ohne Grund kann nicht gesperrt werden.</p>
              </Show>
              <Show when={state.feeDirty() === false && state.taxDirty() === false}>
                <p class="mt-2 text-sm">
                  Aktueller Umsatz (30 Tage): <DashMoney cents={stats()?.revenueCents ?? 0} />
                </p>
              </Show>
            </div>
          </ConfirmDialog>
        </div>
      )}
    </Show>
  )
}
