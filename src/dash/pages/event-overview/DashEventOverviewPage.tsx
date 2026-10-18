import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiCheckCircle } from "@adaptive-ds/mdi/mdiCheckCircle.js"
import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { mdiChevronUp } from "@adaptive-ds/mdi/mdiChevronUp.js"
import { mdiCircleOutline } from "@adaptive-ds/mdi/mdiCircleOutline.js"
import { mdiCurrencyEur } from "@adaptive-ds/mdi/mdiCurrencyEur.js"
import { mdiEyeOffOutline } from "@adaptive-ds/mdi/mdiEyeOffOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { For, Show } from "solid-js"
import { AreaChart } from "#ui/chart/AreaChart.jsx"
import { DonutChart } from "#ui/chart/DonutChart.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { LinkTextInternal } from "#ui/interactive/link/LinkText.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DotPill } from "#ui/static/pill/DotPill.jsx"
import { ProgressBar } from "#ui/static/progress/ProgressBar.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { DashKpiCard } from "../../ui/kpi/DashKpiCard.tsx"
import { DashSection } from "../../ui/layout/DashSection.tsx"
import { DashMoney } from "../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../ui/status/DashStatusPill.tsx"
import { DashRelativeTime } from "../../ui/time/DashRelativeTime.tsx"
import { dashEventOverviewStateCreate } from "./dashEventOverviewStateCreate.ts"
import type { DashEventOverviewOrderRow } from "./dashEventOverviewStateCreate.ts"

const orderColumns: DataTableColumn<DashEventOverviewOrderRow>[] = [
  {
    id: "number",
    header: "Nummer",
    cell: (row) => <span class="font-mono text-[13px]">{row.number}</span>,
    sortValue: (row) => row.number,
  },
  {
    id: "buyer",
    header: "Käufer",
    cell: (row) => (
      <span class="flex min-w-0 flex-col">
        <span class="truncate font-medium">{row.buyerName}</span>
        <span class="truncate text-xs text-content-muted">{row.buyerEmail}</span>
      </span>
    ),
    sortValue: (row) => row.buyerName,
  },
  {
    id: "tickets",
    header: "Tickets",
    align: "right",
    cell: (row) => <span>{row.tickets}</span>,
    sortValue: (row) => row.tickets,
    hideBelow: "sm",
  },
  {
    id: "total",
    header: "Betrag",
    align: "right",
    cell: (row) => <DashMoney cents={row.totalCents} />,
    sortValue: (row) => row.totalCents,
  },
  {
    id: "status",
    header: "Status",
    align: "right",
    cell: (row) => <DashStatusPill kind="order" value={row.status} size="sm" />,
  },
  {
    id: "date",
    header: "Datum",
    align: "right",
    cell: (row) => <DashRelativeTime iso={row.createdAt} />,
    sortValue: (row) => row.createdAt,
    hideBelow: "md",
  },
]

function orderCard(row: DashEventOverviewOrderRow) {
  return (
    <span class="flex flex-col gap-1">
      <span class="flex items-center justify-between gap-2">
        <span class="font-mono text-[13px]">{row.number}</span>
        <DashStatusPill kind="order" value={row.status} size="sm" />
      </span>
      <span class="truncate font-medium">{row.buyerName}</span>
      <span class="flex items-center justify-between gap-2 text-sm text-content-muted">
        <span>
          {row.tickets} {row.tickets === 1 ? "Ticket" : "Tickets"}
        </span>
        <DashMoney cents={row.totalCents} />
      </span>
      <DashRelativeTime iso={row.createdAt} class="text-xs text-content-muted" />
    </span>
  )
}

/** Event-Übersicht: Checkliste, Kennzahlen, Ticketarten, Kurven und letzte Bestellungen. */
export function DashEventOverviewPage(p: { eventId: string }) {
  const state = dashEventOverviewStateCreate({ eventId: () => p.eventId })

  return (
    <div class="flex flex-col gap-6">
      <Show when={state.isDraft()}>
        <DashSection
          title="Event einrichten"
          description="Diese Schritte fehlen dir noch bis zur Veröffentlichung."
          actions={
            <>
              <span class="text-sm tabular-nums text-content-muted">{state.progressLabel()}</span>
              <Show when={state.publishOk()}>
                <LinkButtonInternal
                  to={state.basePath()}
                  search={{ veroeffentlichen: 1 }}
                  variant={buttonVariant.contrast}
                  class="h-8 gap-1.5 px-2.5 text-sm"
                >
                  Veröffentlichen
                </LinkButtonInternal>
              </Show>
              <Button
                type="button"
                variant={buttonVariant.ghost}
                class="h-8 gap-1.5 px-2.5 text-sm"
                onClick={state.toggleChecklist}
                aria-expanded={state.checklistOpen.get()}
              >
                <Icon path={state.checklistOpen.get() ? mdiChevronUp : mdiChevronDown} class="size-4" />
                {state.checklistOpen.get() ? "Einklappen" : "Ausklappen"}
              </Button>
            </>
          }
        >
          <div class="flex flex-col gap-3">
            <ProgressBar
              value={state.doneCount()}
              max={state.checklist().length}
              label={`Setup-Fortschritt: ${state.progressLabel()}`}
            />
            <Show when={state.checklistOpen.get()}>
              <ul class="flex flex-col gap-1.5">
                <For each={state.checklist()}>
                  {(item) => (
                    <li class="flex items-center gap-2 text-sm">
                      <Show
                        when={item.done}
                        fallback={
                          <>
                            <Icon path={mdiCircleOutline} class="size-4 shrink-0 text-content-muted" />
                            <LinkTextInternal to={item.href}>{item.label}</LinkTextInternal>
                          </>
                        }
                      >
                        <Icon path={mdiCheckCircle} class="size-4 shrink-0 text-success" />
                        <span class="text-content-muted">{item.label}</span>
                      </Show>
                    </li>
                  )}
                </For>
              </ul>
            </Show>
          </div>
        </DashSection>
      </Show>

      <div class="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Show when={state.canSeeRevenue()}>
          <DashKpiCard
            label="Umsatz"
            value={state.revenueText()}
            icon={mdiCurrencyEur}
            href={`${state.basePath()}/abrechnung`}
            class="h-full"
          />
        </Show>
        <DashKpiCard
          label="Verkauft"
          value={state.soldText()}
          icon={mdiTicketOutline}
          href={`${state.basePath()}/tickets`}
          class="h-full"
          footer={
            <ProgressBar
              value={state.sold()}
              max={state.capacity()}
              size="sm"
              label={`Verkauft: ${state.soldText()}`}
            />
          }
        />
        <DashKpiCard
          label="Eingecheckt"
          value={state.checkinValue()}
          icon={mdiQrcodeScan}
          href={`${state.basePath()}/einlass`}
          class="h-full"
          footer={
            state.checkinFooter() === null ? undefined : (
              <span class="text-xs text-content-muted">{state.checkinFooter()}</span>
            )
          }
        />
        <DashKpiCard
          label="Offene Zahlungen"
          value={state.openCount()}
          icon={mdiBankOutline}
          href={`${state.basePath()}/bestellungen`}
          search={{ status: "offen" }}
          class="h-full"
          footer={<span class="text-xs text-content-muted">{state.openFooter()}</span>}
        />
      </div>

      <DashSection
        title="Ticketarten"
        actions={
          <LinkButtonInternal
            to={`${state.basePath()}/tickets`}
            variant={buttonVariant.outline}
            class="h-8 gap-1.5 px-2.5 text-sm"
          >
            Bearbeiten
          </LinkButtonInternal>
        }
      >
        <ul class="flex flex-col divide-y divide-border-subtle">
          <For each={state.ticketRows()}>
            {(row) => (
              <li class="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
                <span class="flex flex-wrap items-center gap-1.5">
                  <Show when={row.boxOffice}>
                    <Icon path={mdiCashRegister} class="size-4 shrink-0 text-content-muted" />
                  </Show>
                  <span class="font-medium">{row.name}</span>
                  <Show when={row.hidden}>
                    <DotPill tone="neutral" size="sm" icon={mdiEyeOffOutline}>
                      Versteckt
                    </DotPill>
                  </Show>
                  <DotPill tone={row.phaseTone} size="sm">
                    {row.phaseLabel}
                  </DotPill>
                </span>
                <span class="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  <DashMoney cents={row.priceCents} class="font-medium" />
                  <span class="inline-flex min-w-44 flex-1 items-center gap-2 sm:max-w-60">
                    <ProgressBar
                      value={row.sold}
                      max={row.capacity}
                      size="sm"
                      label={`${row.name}: ${row.sold} von ${row.capacity} verkauft`}
                      class="flex-1"
                    />
                    <span class="tabular-nums text-content-muted">
                      {row.sold} / {row.capacity}
                    </span>
                  </span>
                  <Show when={state.canSeeRevenue()}>
                    <DashMoney cents={row.revenueCents} class="ml-auto font-medium" />
                  </Show>
                </span>
              </li>
            )}
          </For>
        </ul>
      </DashSection>

      <div class="grid gap-6 lg:grid-cols-3">
        <DashSection title="Verkaufskurve" description="Kumulierte Tickets seit Verkaufsstart." class="lg:col-span-2">
          <AreaChart
            points={state.salesPoints()}
            markers={state.salesMarkers()}
            valueFormat={(value) => `${value} Tickets`}
            ariaLabel="Kumulierte verkaufte Tickets mit Phasenwechseln"
          />
        </DashSection>
        <DashSection title="Kanäle" description="Tickets je Verkaufskanal.">
          <DonutChart
            segments={state.channelSegments()}
            valueFormat={(value) => `${value} Tickets`}
            ariaLabel="Tickets je Verkaufskanal"
            center={
              <span class="flex flex-col items-center">
                <span class="text-2xl font-semibold tabular-nums">{state.channelTotal()}</span>
                <span class="text-xs text-content-muted">Tickets</span>
              </span>
            }
          />
        </DashSection>
      </div>

      <DashSection
        title="Letzte Bestellungen"
        footer={<LinkTextInternal to={`${state.basePath()}/bestellungen`}>Alle Bestellungen</LinkTextInternal>}
      >
        <DataTable
          rows={state.orderRows()}
          rowKey={(row) => row.id}
          columns={orderColumns}
          ariaLabel="Letzte Bestellungen"
          onRowClick={(row) => state.openOrder(row.id)}
          mobileCard={orderCard}
          empty={<p class="text-sm text-content-muted">Noch keine Bestellungen für dieses Event.</p>}
        />
      </DashSection>
    </div>
  )
}
