import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCalendarClockOutline } from "@adaptive-ds/mdi/mdiCalendarClockOutline.js"
import { mdiCashMultiple } from "@adaptive-ds/mdi/mdiCashMultiple.js"
import { mdiDownloadOutline } from "@adaptive-ds/mdi/mdiDownloadOutline.js"
import { mdiPercentOutline } from "@adaptive-ds/mdi/mdiPercentOutline.js"
import { mdiWalletOutline } from "@adaptive-ds/mdi/mdiWalletOutline.js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { InfoPopover } from "#ui/interactive/popover/InfoPopover.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DotPill } from "#ui/static/pill/DotPill.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import type { DashFinancePayoutRow } from "../model/dashFinancePayoutRows.ts"
import { DashKpiCard } from "../../../ui/kpi/DashKpiCard.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { dashFinancePageStateCreate } from "./dashFinancePageStateCreate.ts"

/** Org-Finanzseite: KPIs, Auszahlungs-Tabelle, Gebührenmodell und Bankkonto. */
export function DashFinancePage() {
  const state = dashFinancePageStateCreate()

  const columns = (): DataTableColumn<DashFinancePayoutRow>[] => [
    {
      id: "event",
      header: "Event",
      cell: (row) => <span class="font-medium">{row.title}</span>,
      sortValue: (row) => row.title,
    },
    {
      id: "ende",
      header: "Eventende",
      align: "right",
      cell: (row) => <span class="whitespace-nowrap">{state.date(row.endsAt)}</span>,
      sortValue: (row) => row.endsAt,
      hideBelow: "md",
    },
    {
      id: "betrag",
      header: "Betrag",
      align: "right",
      cell: (row) => <DashMoney cents={row.amountCents} />,
      sortValue: (row) => row.amountCents,
    },
    {
      id: "faellig",
      header: "Fälligkeit",
      align: "right",
      cell: (row) => <span class="whitespace-nowrap">{state.date(row.dueAt)}</span>,
      sortValue: (row) => row.dueAt,
      hideBelow: "sm",
    },
    {
      id: "status",
      header: "Status",
      cell: (row) => <DashStatusPill kind="payout" value={row.status} size="sm" />,
    },
    {
      id: "referenz",
      header: "Referenz",
      cell: (row) => <span class="font-mono text-[13px]">{row.reference}</span>,
      hideBelow: "lg",
    },
    {
      id: "pdf",
      header: "PDF",
      align: "center",
      cell: (row) => (
        <Button
          type="button"
          variant={buttonVariant.ghost}
          size="sm"
          class="h-9 px-3 text-sm"
          title={`Abrechnung für ${row.title} öffnen`}
          onClick={(event) => {
            event.stopPropagation()
            state.openEvent(row.eventId)
          }}
        >
          <Icon path={mdiDownloadOutline} class="size-4" />
          <span class="sr-only">Abrechnung öffnen</span>
        </Button>
      ),
    },
  ]

  return (
    <Show when={state.canSee()} fallback={<DashLockedState description="Nur für Finanzen und Inhaber." />}>
      <div class="flex flex-col gap-4">
        <Show when={state.org()}>
          <div class="grid gap-3 sm:grid-cols-3">
            <DashKpiCard
              label="Ausgezahlt (Jahr)"
              value={state.cents(state.paidThisYear())}
              icon={mdiCashMultiple}
              class="h-full"
            />
            <DashKpiCard
              label="Nächste Auszahlung"
              value={state.nextPayout() ? state.cents(state.nextPayout()?.amountCents ?? 0) : "–"}
              icon={mdiCalendarClockOutline}
              class="h-full"
              footer={
                state.nextPayout() ? (
                  <span class="text-xs text-content-muted">
                    {state.nextPayout()?.title} · fällig {state.date(state.nextPayout()?.dueAt ?? "")}
                  </span>
                ) : undefined
              }
            />
            <DashKpiCard
              label="Offen (laufende Events)"
              value={state.cents(state.openTotal())}
              icon={mdiWalletOutline}
              class="h-full"
            />
          </div>

          <DashSection title="Auszahlungen" description="Echte Auszahlungen und geplante Beträge je Event.">
            <Show
              when={state.rows().length > 0}
              fallback={<p class="text-sm text-content-muted">Noch keine Umsätze für Auszahlungen.</p>}
            >
              <DataTable
                rows={state.rows()}
                rowKey={(row) => row.eventId}
                columns={columns()}
                ariaLabel="Auszahlungen"
                onRowClick={(row) => state.openEvent(row.eventId)}
                mobileCard={(row) => (
                  <span class="flex flex-col gap-1">
                    <span class="flex items-center justify-between gap-2">
                      <span class="truncate font-medium">{row.title}</span>
                      <DashStatusPill kind="payout" value={row.status} size="sm" />
                    </span>
                    <span class="flex items-center justify-between gap-2 text-sm text-content-muted">
                      <span>
                        {state.date(row.endsAt)} · {state.date(row.dueAt)}
                      </span>
                      <DashMoney cents={row.amountCents} />
                    </span>
                  </span>
                )}
              />
            </Show>
          </DashSection>

          <div class="grid gap-4 lg:grid-cols-2">
            <DashSection title="Gebührenmodell" description="So werden die Eventoren-Gebühren abgerechnet.">
              <div class="flex flex-col gap-2 text-sm">
                <p class="flex items-center gap-2 font-medium text-content">
                  <Icon path={mdiPercentOutline} class="size-4 shrink-0 text-content-muted" />
                  {state.org()?.fee.payer === "veranstalter"
                    ? "3,5 % + 0,29 € je Ticket · trägt der Veranstalter"
                    : "5 % + 0,49 € je Ticket · trägt der Käufer"}
                </p>
                <p class="text-content-muted">
                  Beispiel: 25,00 € Ticket → Gebühr {state.cents(state.feeExample()?.feeCents ?? 0)}
                  <InfoPopover>Vom Plattform-Admin festgelegt.</InfoPopover>
                </p>
              </div>
            </DashSection>
            <DashSection
              title="Bankkonto"
              description="Auszahlungsziel für deine Events."
              actions={
                <Show when={state.canEditBank()}>
                  <Button
                    type="button"
                    variant={buttonVariant.outline}
                    class="h-9 px-3 text-sm"
                    onClick={state.openSettings}
                  >
                    Ändern
                  </Button>
                </Show>
              }
            >
              <div class="flex items-center gap-3 text-sm">
                <span class="flex size-10 shrink-0 items-center justify-center rounded-full bg-brand-soft">
                  <Icon path={mdiBankOutline} class="size-5 text-brand" />
                </span>
                <div class="min-w-0">
                  <p class="truncate font-medium text-content">{state.org()?.bank.holder}</p>
                  <p class="font-mono text-[13px] text-content-muted">{state.maskedIban()}</p>
                </div>
                <Show when={state.org()?.status === "aktiv"}>
                  <span class="ml-auto">
                    <DotPill tone="success" size="sm">
                      Aktiv
                    </DotPill>
                  </span>
                </Show>
              </div>
            </DashSection>
          </div>
        </Show>
      </div>
    </Show>
  )
}
