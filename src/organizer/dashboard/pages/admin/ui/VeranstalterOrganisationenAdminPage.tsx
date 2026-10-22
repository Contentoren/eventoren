import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { SelectSingleNative } from "#ui/input/select/SelectSingleNative.jsx"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { mdiDomain } from "@adaptive-ds/mdi/mdiDomain.js"
import { veranstalterOrganisationenAdminBerlinTimeFormat } from "./veranstalterOrganisationenAdminBerlinTimeFormat.ts"
import type { VeranstalterOrganisationenAdminPageState } from "./veranstalterOrganisationenAdminPageStateCreate.ts"

const statusOptions = ["pruefung", "aktiv", "gesperrt"]

const statusLabels: Record<string, string> = {
  pruefung: "In Prüfung",
  aktiv: "Aktiv",
  gesperrt: "Gesperrt",
}

const taxStatusOptions = ["regel", "klein"]

const taxStatusLabels: Record<string, string> = {
  regel: "Regelbesteuert",
  klein: "Kleinunternehmer (§ 19)",
}

const taxRateOptions = ["1900", "700"]

const taxRateLabels: Record<string, string> = {
  "1900": "19 %",
  "700": "7 %",
}

const payerOptions = ["kaeufer", "veranstalter"]

const payerLabels: Record<string, string> = {
  kaeufer: "Käufer",
  veranstalter: "Veranstalter",
}

/** Global-admin organisation review: paginated list, status filter, URL-driven detail sheet. */
export function VeranstalterOrganisationenAdminPage(p: {
  readonly state: VeranstalterOrganisationenAdminPageState
  readonly status: () => string
  readonly selectStatusFilter: (status: string) => void
}) {
  const state = p.state
  return (
    <div class="flex flex-col gap-4">
      <div>
        <h1 class="text-xl font-semibold text-content">Veranstalter-Organisationen</h1>
        <p class="mt-1 text-sm text-content-muted">
          Prüfung, Steuer- und Gebührenkonfiguration sowie Freigabe oder Sperrung. Bankdaten sind nur hier im
          Admin-Detail vollständig sichtbar.
        </p>
      </div>
      <CardWrapper class="rounded-card border-border-subtle shadow-none">
        <div class="flex flex-col gap-1.5 p-4 sm:p-6">
          <Label for="admin-org-status">Statusfilter</Label>
          <SelectSingleNative
            id="admin-org-status"
            valueSignal={{ get: p.status, set: p.selectStatusFilter }}
            getOptions={() => ["alle", ...statusOptions]}
            valueText={(value) => (value === "alle" ? "Alle Status" : (statusLabels[value] ?? value))}
          />
        </div>
      </CardWrapper>
      <Show when={state.list.result() === undefined}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <p class="p-4 text-sm text-content-muted">Wird geladen …</p>
        </CardWrapper>
      </Show>
      <Show when={state.listError() !== null}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
            {state.listError()}
          </p>
        </CardWrapper>
      </Show>
      <Show when={state.list.result() !== undefined && state.listError() === null}>
        <CardWrapper class="rounded-card border-border-subtle shadow-none">
          <ul class="flex flex-col divide-y divide-border-subtle">
            <For each={state.listItems()}>
              {(item) => {
                const org = item as {
                  orgId: string
                  name: string
                  slug: string
                  kind: string
                  status: string
                  configurationConfirmed: boolean
                }
                return (
                  <li class="flex flex-wrap items-center gap-2 p-4">
                    <div class="min-w-0 flex-1">
                      <p class="truncate text-sm font-semibold text-content">{org.name}</p>
                      <p class="truncate text-xs text-content-muted">
                        {org.slug} · {org.kind}
                      </p>
                    </div>
                    <Badge>{statusLabels[org.status] ?? org.status}</Badge>
                    <Show when={org.configurationConfirmed}>
                      <Badge>Konfiguriert</Badge>
                    </Show>
                    <Button type="button" variant="outline" size="sm" onClick={() => state.selectOrg(org.orgId)}>
                      Details
                    </Button>
                  </li>
                )
              }}
            </For>
          </ul>
          <Show when={state.listItems().length === 0 && !state.list.isLoading()}>
            <EmptyState
              icon={mdiDomain}
              title="Keine Organisationen"
              description="Für diesen Status liegen keine Organisationen vor."
            />
          </Show>
        </CardWrapper>
      </Show>
      <Show when={state.detail()}>
        {(detail) => (
          <CardWrapper class="rounded-card border-border-subtle shadow-none">
            <div class="flex flex-col gap-4 p-4 sm:p-6" role="dialog" aria-label={`Details ${detail().profile.name}`}>
              <div class="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h2 class="text-lg font-semibold text-content">{detail().profile.name}</h2>
                  <p class="text-sm text-content-muted">
                    {detail().profile.slug} · {detail().profile.kind} ·{" "}
                    {statusLabels[detail().status] ?? detail().status}
                  </p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={state.closeDetail}>
                  Schließen
                </Button>
              </div>
              <dl class="flex flex-col gap-2 text-sm">
                <div class="flex flex-col gap-1">
                  <dt class="text-content-muted">Bankverbindung (vollständig, nur für globale Admins)</dt>
                  <dd class="text-content">
                    {detail().bank ? `${detail().bank!.iban} · ${detail().bank!.holder}` : "Nicht hinterlegt"}
                  </dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="text-content-muted">Verträge</dt>
                  <dd class="text-content">
                    <p>
                      {detail().contracts.current
                        ? "Aktuelle Vertragsmuster bestätigt"
                        : "Keine aktuelle revisionierte Zustimmung — Aktivierung gesperrt"}
                    </p>
                    <p>
                      AGB (MUSTER): {detail().contracts.termsRevision ?? "keine Revision"} ·{" "}
                      {veranstalterOrganisationenAdminBerlinTimeFormat(detail().contracts.termsConsentedAt) ?? "offen"}
                    </p>
                    <p>
                      AVV (MUSTER): {detail().contracts.dpaRevision ?? "keine Revision"} ·{" "}
                      {veranstalterOrganisationenAdminBerlinTimeFormat(detail().contracts.dpaConsentedAt) ?? "offen"}
                    </p>
                    <p>
                      Historische Zeitstempel (kein aktueller Zustimmungsnachweis): AGB{" "}
                      {veranstalterOrganisationenAdminBerlinTimeFormat(detail().contracts.termsAcceptedAt) ?? "offen"} ·
                      AVV {veranstalterOrganisationenAdminBerlinTimeFormat(detail().contracts.dpaAcceptedAt) ?? "offen"}
                    </p>
                  </dd>
                </div>
                <div class="flex flex-col gap-1">
                  <dt class="text-content-muted">Aktuelle Konfiguration</dt>
                  <dd class="text-content">
                    {detail().tax.status === "klein" ? "Kleinunternehmer" : "Regelbesteuert"},{" "}
                    {detail().tax.defaultRateBps === 700 ? "7 %" : "19 %"} · Gebühr{" "}
                    {(detail().fee.percentBps / 100).toLocaleString("de-DE")} % +{" "}
                    {(detail().fee.fixedCents / 100).toLocaleString("de-DE", {
                      style: "currency",
                      currency: "EUR",
                    })}{" "}
                    ({detail().fee.payer === "kaeufer" ? "Käufer" : "Veranstalter"})
                    {detail().configurationConfirmed ? " · bestätigt" : " · unbestätigt"}
                  </dd>
                </div>
              </dl>
              <form
                class="flex flex-col gap-4 border-t border-border-subtle pt-4"
                onSubmit={(event) => {
                  event.preventDefault()
                  void state.configureSave()
                }}
              >
                <h3 class="text-sm font-semibold text-content">Steuer und Gebühr konfigurieren</h3>
                <div class="grid gap-4 sm:grid-cols-2">
                  <div class="flex flex-col gap-1.5">
                    <Label for="admin-org-tax-status">Steuerstatus</Label>
                    <SelectSingleNative
                      id="admin-org-tax-status"
                      valueSignal={state.taxStatus}
                      getOptions={() => taxStatusOptions}
                      valueText={(value) => taxStatusLabels[value] ?? value}
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="admin-org-tax-rate">Standardsteuersatz (unabhängig vom Status)</Label>
                    <SelectSingleNative
                      id="admin-org-tax-rate"
                      valueSignal={state.taxRateBps}
                      getOptions={() => taxRateOptions}
                      valueText={(value) => taxRateLabels[value] ?? value}
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="admin-org-fee-percent">Gebühr in Prozent (0–100)</Label>
                    <Input
                      id="admin-org-fee-percent"
                      value={state.feePercent.get()}
                      onInput={(event) => state.feePercent.set(event.currentTarget.value)}
                      inputmode="decimal"
                      autocomplete="off"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="admin-org-fee-fixed">Fixbetrag in Euro</Label>
                    <Input
                      id="admin-org-fee-fixed"
                      value={state.feeFixedEuro.get()}
                      onInput={(event) => state.feeFixedEuro.set(event.currentTarget.value)}
                      inputmode="decimal"
                      autocomplete="off"
                    />
                  </div>
                  <div class="flex flex-col gap-1.5">
                    <Label for="admin-org-fee-payer">Gebühr trägt</Label>
                    <SelectSingleNative
                      id="admin-org-fee-payer"
                      valueSignal={state.feePayer}
                      getOptions={() => payerOptions}
                      valueText={(value) => payerLabels[value] ?? value}
                    />
                  </div>
                </div>
                <Show when={state.configureError() !== null}>
                  <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                    {state.configureError()}
                  </p>
                </Show>
                <div>
                  <Button type="submit" variant="contrast" disabled={state.working.get()}>
                    {state.working.get() ? "Wird gespeichert …" : "Konfiguration speichern"}
                  </Button>
                </div>
              </form>
              <div class="flex flex-col gap-4 border-t border-border-subtle pt-4">
                <h3 class="text-sm font-semibold text-content">Status</h3>
                <Show when={state.approveBlocker()}>
                  {(message) => (
                    <p role="note" class="rounded-xl bg-warning-soft px-4 py-3 text-sm text-warning">
                      {message()}
                    </p>
                  )}
                </Show>
                <div class="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="contrast"
                    disabled={state.approveBlocker() !== null || state.working.get()}
                    onClick={() => void state.approve()}
                  >
                    Freigeben
                  </Button>
                </div>
                <form
                  class="flex flex-col gap-2"
                  onSubmit={(event) => {
                    event.preventDefault()
                    void state.block()
                  }}
                >
                  <Label for="admin-org-block-reason">Sperrgrund (Pflicht)</Label>
                  <Input
                    id="admin-org-block-reason"
                    value={state.blockReason.get()}
                    onInput={(event) => state.blockReason.set(event.currentTarget.value)}
                    autocomplete="off"
                  />
                  <div>
                    <Button type="submit" variant="outlineRed" disabled={state.working.get()}>
                      Sperren
                    </Button>
                  </div>
                </form>
                <Show when={detail().status === "gesperrt"}>
                  <form
                    class="flex flex-col gap-2"
                    onSubmit={(event) => {
                      event.preventDefault()
                      void state.unblock()
                    }}
                  >
                    <Label for="admin-org-unblock-target">Entsperren nach</Label>
                    <SelectSingleNative
                      id="admin-org-unblock-target"
                      valueSignal={state.unblockTarget}
                      getOptions={() => ["pruefung", "aktiv"]}
                      valueText={(value) => statusLabels[value] ?? value}
                    />
                    <div>
                      <Button type="submit" variant="outline" disabled={state.working.get()}>
                        Entsperren
                      </Button>
                    </div>
                  </form>
                </Show>
                <Show when={state.detailError()}>
                  {(message) => (
                    <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                      {message()}
                    </p>
                  )}
                </Show>
                <Show when={state.serverError.get()}>
                  {(message) => (
                    <p role="alert" class="rounded-xl bg-danger-soft px-4 py-3 text-sm text-danger">
                      {message()}
                    </p>
                  )}
                </Show>
                <Show when={state.confirmed.get()}>
                  {(message) => (
                    <p role="status" class="rounded-xl bg-success-soft px-4 py-3 text-sm text-success">
                      {message()}
                    </p>
                  )}
                </Show>
              </div>
            </div>
          </CardWrapper>
        )}
      </Show>
    </div>
  )
}
