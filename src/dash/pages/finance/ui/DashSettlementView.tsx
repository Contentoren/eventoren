import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCalculatorVariantOutline } from "@adaptive-ds/mdi/mdiCalculatorVariantOutline.js"
import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiCreditCardOutline } from "@adaptive-ds/mdi/mdiCreditCardOutline.js"
import { mdiWalletOutline } from "@adaptive-ds/mdi/mdiWalletOutline.js"
import { mdiFileDelimitedOutline } from "@adaptive-ds/mdi/mdiFileDelimitedOutline.js"
import { mdiFilePdfBox } from "@adaptive-ds/mdi/mdiFilePdfBox.js"
import { mdiPercentOutline } from "@adaptive-ds/mdi/mdiPercentOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { mdiUndoVariant } from "@adaptive-ds/mdi/mdiUndoVariant.js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { InfoPopover } from "#ui/interactive/popover/InfoPopover.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { DotPill } from "#ui/static/pill/DotPill.jsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashSettlementCompute } from "../../../model/dashSettlementCompute.ts"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { dashSettlementViewStateCreate } from "./dashSettlementViewStateCreate.ts"

const rowIcons: Record<string, string> = {
  brutto: mdiTicketOutline,
  erstattung: mdiCashRefund,
  rueckbuchung: mdiUndoVariant,
  plattform: mdiPercentOutline,
  zahlung: mdiCreditCardOutline,
  auszahlung: mdiWalletOutline,
}

const methodLabels: Record<string, string> = {
  karte: "Karte",
  paypal: "PayPal",
  sepa: "SEPA",
  applepay: "Apple Pay",
  googlepay: "Google Pay",
  gutschein: "Gutschein",
  kostenlos: "Kostenlos",
}

type SettlementResult = ReturnType<typeof dashSettlementCompute>

/** Geteilte Abrechnungsansicht: Statuskarte, Wasserfall, Tabellen und Downloads. Prüft keine Rollen — das übernimmt die einbettende Seite. */
export function DashSettlementView(p: { eventId: string; readOnly?: boolean }) {
  const state = dashSettlementViewStateCreate({ eventId: () => p.eventId, readOnly: () => p.readOnly ?? false })

  const ticketColumns = (): DataTableColumn<SettlementResult["byTicketType"][number]>[] => [
    {
      id: "name",
      header: "Ticketart",
      cell: (row) => <span class="font-medium">{row.name}</span>,
      sortValue: (row) => row.name,
    },
    {
      id: "sold",
      header: "Verkauft",
      align: "right",
      cell: (row) => <span>{row.sold}</span>,
      sortValue: (row) => row.sold,
    },
    {
      id: "brutto",
      header: "Brutto",
      align: "right",
      cell: (row) => <DashMoney cents={row.grossCents} />,
      sortValue: (row) => row.grossCents,
    },
    {
      id: "netto",
      header: "Netto",
      align: "right",
      cell: (row) => <DashMoney cents={row.netCents} />,
      sortValue: (row) => row.netCents,
      hideBelow: "sm",
    },
    {
      id: "ust",
      header: "USt",
      align: "right",
      cell: (row) => <DashMoney cents={row.taxCents} />,
      sortValue: (row) => row.taxCents,
      hideBelow: "sm",
    },
  ]

  const taxColumns = (): DataTableColumn<SettlementResult["taxByRate"][number]>[] => [
    {
      id: "satz",
      header: "Steuersatz",
      cell: (row) => <span class="font-medium">{(row.rateBps / 100).toFixed(1).replace(".", ",")} %</span>,
      sortValue: (row) => row.rateBps,
    },
    {
      id: "brutto",
      header: "Brutto",
      align: "right",
      cell: (row) => <DashMoney cents={row.grossCents} />,
      sortValue: (row) => row.grossCents,
    },
    {
      id: "netto",
      header: "Netto",
      align: "right",
      cell: (row) => <DashMoney cents={row.netCents} />,
      sortValue: (row) => row.netCents,
    },
    {
      id: "ust",
      header: "USt",
      align: "right",
      cell: (row) => <DashMoney cents={row.taxCents} />,
      sortValue: (row) => row.taxCents,
    },
  ]

  const payColumns = (): DataTableColumn<SettlementResult["byPaymentMethod"][number]>[] => [
    {
      id: "methode",
      header: "Zahlart",
      cell: (row) => <span class="font-medium">{methodLabels[row.method] ?? row.method}</span>,
      sortValue: (row) => row.method,
    },
    {
      id: "anzahl",
      header: "Bestellungen",
      align: "right",
      cell: (row) => <span>{row.orders}</span>,
      sortValue: (row) => row.orders,
    },
    {
      id: "betrag",
      header: "Betrag",
      align: "right",
      cell: (row) => <DashMoney cents={row.amountCents} />,
      sortValue: (row) => row.amountCents,
    },
    {
      id: "kosten",
      header: "Kosten",
      align: "right",
      cell: (row) => <DashMoney cents={row.costCents} />,
      sortValue: (row) => row.costCents,
    },
  ]

  return (
    <Show when={state.event() && state.settlement() && state.payoutInfo()}>
      <div class="flex flex-col gap-4">
        <section class="rounded-card border border-border-subtle bg-surface p-4 sm:p-5" aria-label="Auszahlungsstatus">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div class="flex min-w-0 items-center gap-3">
              <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                <Icon path={mdiBankOutline} class="size-5 text-brand" />
              </span>
              <div class="min-w-0">
                <p class="font-semibold text-content">{state.statusText()}</p>
                <p class="mt-0.5 text-sm text-content-muted">
                  Ziel: {state.maskedIban()}
                  <Show when={!state.readOnly()}>
                    {" · "}
                    <LinkButtonInternal
                      to="/demo/dashboard/einstellungen"
                      variant={buttonVariant.link}
                      class="h-auto px-0 text-sm"
                    >
                      Ändern
                    </LinkButtonInternal>
                  </Show>
                </p>
              </div>
            </div>
            <DashStatusPill kind="payout" value={state.payoutInfo()?.status ?? "geplant"} />
          </div>
        </section>

        <DashSection title="Wasserfall" description="Vom Ticketumsatz bis zur Auszahlung.">
          <ul class="flex flex-col">
            <For each={state.waterfall()}>
              {(row) => (
                <li
                  class={
                    row.final
                      ? "flex items-center gap-3 border-t-2 border-content pt-3"
                      : "flex items-center gap-3 border-b border-border-subtle py-2.5 last:border-b-0"
                  }
                >
                  <Icon
                    path={rowIcons[row.id] ?? mdiCalculatorVariantOutline}
                    class={row.final ? "size-5 shrink-0 text-content" : "size-5 shrink-0 text-content-muted"}
                  />
                  <span class={row.final ? "flex-1 text-base font-bold text-content" : "flex-1 text-sm text-content"}>
                    {row.id === "plattform" ? (
                      <span class="inline-flex items-center">
                        {row.label}
                        <InfoPopover>Gebührenmodell: 3,5 % + 0,29 € je Ticket, trägt der Veranstalter.</InfoPopover>
                      </span>
                    ) : (
                      row.label
                    )}
                  </span>
                  <DashMoney
                    cents={row.negativ ? -row.cents : row.cents}
                    class={row.final ? "text-lg font-bold" : row.negativ ? "text-danger" : "font-medium"}
                  />
                </li>
              )}
            </For>
          </ul>
          <Show when={(state.settlement()?.buyerFeesCents ?? 0) > 0}>
            <p class="mt-3 text-sm text-content-muted">
              Servicegebühren der Käufer: {dashCentsFormat(state.settlement()?.buyerFeesCents ?? 0)} (gehen an
              Eventoren)
            </p>
          </Show>
          <Show when={(state.settlement()?.voucherPaidCents ?? 0) > 0}>
            <p class="mt-1 text-sm text-content-muted">
              Davon per Gutschein bezahlt: {dashCentsFormat(state.settlement()?.voucherPaidCents ?? 0)}
            </p>
          </Show>
          <Show when={(state.settlement()?.openOrders.count ?? 0) > 0}>
            <p class="mt-1 text-sm text-content-muted">
              {state.settlement()?.openOrders.count}{" "}
              {(state.settlement()?.openOrders.count ?? 0) === 1 ? "offene Zahlung" : "offene Zahlungen"} (
              {dashCentsFormat(state.settlement()?.openOrders.amountCents ?? 0)}){" "}
              {state.settlement()?.openOrders.count === 1 ? "ist" : "sind"} noch nicht enthalten
            </p>
          </Show>
        </DashSection>

        <DashSection title="Nach Ticketart" description="Verkauft, Brutto, Netto und USt je Ticketart.">
          <Show
            when={(state.settlement()?.byTicketType.length ?? 0) > 0}
            fallback={<p class="text-sm text-content-muted">Noch keine Ticketumsätze.</p>}
          >
            <DataTable
              rows={state.settlement()?.byTicketType ?? []}
              rowKey={(row) => row.ticketTypeId}
              columns={ticketColumns()}
              ariaLabel="Umsatz nach Ticketart"
            />
          </Show>
        </DashSection>

        <DashSection title="Nach Steuersatz" description="Aufteilung der Umsätze nach Steuersatz.">
          <Show
            when={(state.settlement()?.taxByRate.length ?? 0) > 0}
            fallback={
              <p class="text-sm text-content-muted">
                {state.org()?.tax.status === "klein"
                  ? "§ 19 UStG – keine Umsatzsteuer"
                  : "Noch keine steuerpflichtigen Umsätze."}
              </p>
            }
          >
            <DataTable
              rows={state.settlement()?.taxByRate ?? []}
              rowKey={(row) => String(row.rateBps)}
              columns={taxColumns()}
              ariaLabel="Umsatz nach Steuersatz"
            />
          </Show>
        </DashSection>

        <DashSection title="Nach Zahlart" description="Bestellungen, Beträge und Kosten je Zahlart.">
          <Show
            when={(state.settlement()?.byPaymentMethod.length ?? 0) > 0}
            fallback={<p class="text-sm text-content-muted">Noch keine Zahlungen.</p>}
          >
            <DataTable
              rows={state.settlement()?.byPaymentMethod ?? []}
              rowKey={(row) => row.method}
              columns={payColumns()}
              ariaLabel="Umsatz nach Zahlart"
            />
          </Show>
        </DashSection>

        <DashSection title="Downloads" description="Abrechnung und Positionen für deine Unterlagen.">
          <div class="flex flex-wrap gap-2">
            <Show when={!state.readOnly()}>
              <Button
                type="button"
                variant={buttonVariant.outline}
                class="h-9 px-3 text-sm"
                onClick={state.downloadPdf}
              >
                <Icon path={mdiFilePdfBox} class="size-4" />
                Abrechnung (PDF)
              </Button>
              <Button
                type="button"
                variant={buttonVariant.outline}
                class="h-9 px-3 text-sm"
                onClick={state.downloadCsv}
              >
                <Icon path={mdiFileDelimitedOutline} class="size-4" />
                Positionen (CSV)
              </Button>
            </Show>
            <Show when={state.readOnly()}>
              <Button
                type="button"
                variant={buttonVariant.outline}
                class="h-9 px-3 text-sm"
                onClick={state.downloadPdf}
              >
                <Icon path={mdiFilePdfBox} class="size-4" />
                Abrechnung (PDF)
              </Button>
            </Show>
            <Button
              type="button"
              variant={buttonVariant.outline}
              class="h-9 px-3 text-sm"
              onClick={state.downloadProvision}
            >
              <Icon path={mdiFilePdfBox} class="size-4" />
              Provisionsrechnung (PDF)
              <DotPill tone="neutral" size="sm" dot={false} class="ml-2">
                Lexware
              </DotPill>
            </Button>
          </div>
        </DashSection>
      </div>
    </Show>
  )
}
