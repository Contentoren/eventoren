import { Show } from "solid-js"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { OrganizerContractLinks } from "../../../contracts/OrganizerContractLinks.tsx"
import type { VeranstalterDashboardShellState } from "../../../ui/veranstalterDashboardShellStateCreate.ts"
import { veranstalterEinstellungenPageStateCreate } from "./veranstalterEinstellungenPageStateCreate.ts"

const kindOptions = ["verein", "unternehmen", "schule", "privat"]

const kindLabels: Record<string, string> = {
  verein: "Verein",
  unternehmen: "Unternehmen",
  schule: "Schule",
  privat: "Privatperson",
}

function feeLabel(fee: { percentBps: number; fixedCents: number; payer: string }): string {
  const percent = (fee.percentBps / 100).toLocaleString("de-DE")
  const fixed = (fee.fixedCents / 100).toLocaleString("de-DE", { style: "currency", currency: "EUR" })
  const payer = fee.payer === "kaeufer" ? "Käufer" : "Veranstalter"
  return `${percent} % + ${fixed} (trägt: ${payer})`
}

function taxLabel(tax: { status: string; defaultRateBps: number }): string {
  const rate = tax.defaultRateBps === 700 ? "7 %" : "19 %"
  const status = tax.status === "klein" ? "Kleinunternehmer (§ 19)" : "Regelbesteuert"
  return `${status}, Standardsatz ${rate}`
}

/** Owner settings: profile/bank editing via the real update mutation; fee/tax read-only. */
export function VeranstalterEinstellungenPage(p: { readonly shell: VeranstalterDashboardShellState }) {
  const state = veranstalterEinstellungenPageStateCreate({
    orgId: () => p.shell.activeOrganization()?.id,
    permissions: () => p.shell.activeOrganization()?.permissions ?? [],
  })
  return (
    <div class="flex flex-col gap-4">
      <div>
        <h1 class="text-xl font-semibold text-content">Einstellungen</h1>
        <p class="mt-1 text-sm text-content-muted">
          Profil und Bankverbindung der aktiven Organisation. Gebühren und Steuern legt die Administration fest und sind
          hier nur einsehbar.
        </p>
      </div>
      <Show when={state.profileResult() === undefined}>
        <CardWrapper>
          <p class="p-4 text-sm text-content-muted">Wird geladen …</p>
        </CardWrapper>
      </Show>
      <Show when={state.profileError() !== null}>
        <CardWrapper>
          <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {state.profileError() ?? "Keine Organisation ausgewählt."}
          </p>
        </CardWrapper>
      </Show>
      <Show when={state.storedProfile()}>
        {(stored) => (
          <>
            <CardWrapper>
              <form
                class="flex flex-col gap-4 p-4 sm:p-6"
                onSubmit={(event) => {
                  event.preventDefault()
                  void state.submit()
                }}
              >
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="flex flex-col gap-1.5">
                    <Label for="settings-name">Name</Label>
                    <Input
                      id="settings-name"
                      value={state.name.get()}
                      onInput={(event) => state.name.set(event.currentTarget.value)}
                      disabled={!state.canEditProfile()}
                      autocomplete="organization"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="settings-kind">Art</Label>
                    <SelectSingleNative
                      id="settings-kind"
                      valueSignal={state.kind}
                      getOptions={() => kindOptions}
                      valueText={(value) => kindLabels[value] ?? value}
                      disabled={!state.canEditProfile()}
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="settings-email">Kontakt-E-Mail</Label>
                    <Input
                      id="settings-email"
                      type="email"
                      value={state.contactEmail.get()}
                      onInput={(event) => state.contactEmail.set(event.currentTarget.value)}
                      disabled={!state.canEditProfile()}
                      autocomplete="email"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="settings-phone">Kontakt-Telefon</Label>
                    <Input
                      id="settings-phone"
                      type="tel"
                      value={state.contactPhone.get()}
                      onInput={(event) => state.contactPhone.set(event.currentTarget.value)}
                      disabled={!state.canEditProfile()}
                      autocomplete="tel"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5 sm:col-span-2">
                    <Label for="settings-imprint">Impressum</Label>
                    <Textarea
                      id="settings-imprint"
                      value={state.imprint.get()}
                      onInput={(event) => state.imprint.set(event.currentTarget.value)}
                      disabled={!state.canEditProfile()}
                    />
                  </div>
                  <Show when={state.canEditBank() || state.canViewBank()}>
                    <div class="flex flex-col gap-1.5">
                      <Label for="settings-iban">IBAN</Label>
                      <Input
                        id="settings-iban"
                        value={state.iban.get()}
                        onInput={(event) => state.iban.set(event.currentTarget.value)}
                        disabled={!state.canEditBank()}
                        autocomplete="off"
                        spellcheck={false}
                      />
                    </div>
                    <div class="flex flex-col gap-1.5">
                      <Label for="settings-holder">Kontoinhaber</Label>
                      <Input
                        id="settings-holder"
                        value={state.bankHolder.get()}
                        onInput={(event) => state.bankHolder.set(event.currentTarget.value)}
                        disabled={!state.canEditBank()}
                        autocomplete="off"
                      />
                    </div>
                  </Show>
                </div>
                <Show when={!state.canEditBank() && state.canViewBank()}>
                  <p role="note" class="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
                    Die Bankverbindung ist für deine Rolle schreibgeschützt.
                  </p>
                </Show>
                <Show when={state.blockerMessage()}>
                  {(message) => (
                    <p role="status" class="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
                      {message()}
                    </p>
                  )}
                </Show>
                <Show when={state.validationError() !== null}>
                  <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                    {state.validationError()}
                  </p>
                </Show>
                <Show when={state.serverError.get()}>
                  {(message) => (
                    <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                      {message()}
                    </p>
                  )}
                </Show>
                <Show when={state.saved.get()}>
                  <p role="status" class="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
                    Gespeichert.
                  </p>
                </Show>
                <div>
                  <Button type="submit" variant="contrast" disabled={!state.canSubmit()}>
                    {state.submitting.get() ? "Wird gespeichert …" : "Speichern"}
                  </Button>
                </div>
              </form>
            </CardWrapper>
            <CardWrapper>
              <dl class="flex flex-col gap-3 p-4 sm:p-6">
                <div class="flex flex-wrap items-center gap-2">
                  <dt class="text-sm text-content-muted">Status</dt>
                  <dd>
                    <Badge>{stored().status}</Badge>
                  </dd>
                  <Show when={stored().configurationConfirmed}>
                    <dd>
                      <Badge>Konfiguration bestätigt</Badge>
                    </dd>
                  </Show>
                </div>
                <Show when={stored().fee}>
                  {(fee) => (
                    <div class="flex flex-col gap-1">
                      <dt class="text-sm text-content-muted">Gebühr (nur Ansicht, keine Änderung möglich)</dt>
                      <dd class="text-sm text-content">{feeLabel(fee())}</dd>
                    </div>
                  )}
                </Show>
                <Show when={stored().tax}>
                  {(tax) => (
                    <div class="flex flex-col gap-1">
                      <dt class="text-sm text-content-muted">Steuer (nur Ansicht, keine Änderung möglich)</dt>
                      <dd class="text-sm text-content">{taxLabel(tax())}</dd>
                    </div>
                  )}
                </Show>
                <div class="flex flex-col gap-1">
                  <dt class="text-sm text-content-muted">Verträge</dt>
                  <dd class="text-sm text-content">
                    {stored().contracts.current
                      ? "Aktuelle Vertragsmuster bestätigt"
                      : "Aktuelle Vertragsmuster noch nicht bestätigt (Alt-Zeitstempel sind keine aktuelle Zustimmung)"}
                    <p>
                      AGB: {stored().contracts.termsRevision ?? "keine Revision"} ·{" "}
                      {state.contractDateLabel(stored().contracts.termsConsentedAt)}
                    </p>
                    <p>
                      AVV: {stored().contracts.dpaRevision ?? "keine Revision"} ·{" "}
                      {state.contractDateLabel(stored().contracts.dpaConsentedAt)}
                    </p>
                  </dd>
                </div>
              </dl>
              <div class="flex flex-col gap-3 p-4 sm:p-6">
                <OrganizerContractLinks />
                <Show when={!stored().contracts.current}>
                  <p>
                    Nur die inhabende Person darf für die Organisation zustimmen. Ohne aktuelle Zustimmung ist keine
                    (erneute) Aktivierung möglich.
                  </p>
                  <Checkbox
                    disabled={!stored().canAcceptContracts}
                    checked={state.termsAccepted.get()}
                    onChange={state.termsAccepted.set}
                  >
                    Ich stimme den verlinkten Muster-Veranstalter-AGB in der angegebenen Revision für meine Organisation
                    zu.
                  </Checkbox>
                  <Checkbox
                    disabled={!stored().canAcceptContracts}
                    checked={state.dpaAccepted.get()}
                    onChange={state.dpaAccepted.set}
                  >
                    Ich stimme der verlinkten Muster-AVV in der angegebenen Revision für meine Organisation zu.
                  </Checkbox>
                  <Button
                    type="button"
                    variant="contrast"
                    disabled={
                      !stored().canAcceptContracts ||
                      !state.termsAccepted.get() ||
                      !state.dpaAccepted.get() ||
                      state.contractsSubmitting.get()
                    }
                    onClick={() => void state.submitContracts()}
                  >
                    {state.contractsSubmitting.get() ? "Wird bestätigt …" : "Vertragsmuster ausdrücklich bestätigen"}
                  </Button>
                </Show>
              </div>
            </CardWrapper>
          </>
        )}
      </Show>
    </div>
  )
}
