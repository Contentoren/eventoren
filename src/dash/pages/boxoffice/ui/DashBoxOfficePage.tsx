import { For, Show } from "solid-js"
import { mdiCashMultiple } from "@adaptive-ds/mdi/mdiCashMultiple.js"
import { mdiCashRegister } from "@adaptive-ds/mdi/mdiCashRegister.js"
import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { mdiClockOutline } from "@adaptive-ds/mdi/mdiClockOutline.js"
import { mdiCreditCardOutline } from "@adaptive-ds/mdi/mdiCreditCardOutline.js"
import { mdiLockOutline } from "@adaptive-ds/mdi/mdiLockOutline.js"
import { mdiOpenInNew } from "@adaptive-ds/mdi/mdiOpenInNew.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiPrinterOutline } from "@adaptive-ds/mdi/mdiPrinterOutline.js"
import { mdiTicketOutline } from "@adaptive-ds/mdi/mdiTicketOutline.js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { ToggleSwitch } from "#ui/input/toggle/ToggleSwitch.jsx"
import { LinkButtonInternal } from "#ui/interactive/link/LinkButton.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashBoxOfficeSale } from "../../../model/dashBoxOfficeSaleSchema.ts"
import type { DashTicketType } from "../../../model/dashTicketTypeSchema.ts"
import { dashTicketTypeSales } from "../../../model/dashTicketTypeSales.ts"
import { dashDownload } from "../../../export/dashDownload.ts"
import { dashFileNameCreate } from "../../../export/dashFileNameCreate.ts"
import { dashEventById } from "../../../store/dashEventById.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashEventPatch } from "../../../store/actions/dashEventPatch.ts"
import { dashTicketTypeUpsert } from "../../../store/actions/dashTicketTypeUpsert.ts"
import { dashBoxOfficeConfigSet } from "../../../store/actions/boxoffice/dashBoxOfficeConfigSet.ts"
import { dashBoxOfficeTicketAdd } from "../../../store/actions/boxoffice/dashBoxOfficeTicketAdd.ts"
import { DashDateTimeInput } from "../../../ui/form/DashDateTimeInput.tsx"
import { DashMoneyInput } from "../../../ui/form/DashMoneyInput.tsx"
import { DashKpiCard } from "../../../ui/kpi/DashKpiCard.tsx"
import { DashField } from "../../../ui/layout/DashField.tsx"
import { DashSection } from "../../../ui/layout/DashSection.tsx"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashLockedState } from "../../../ui/locked/DashLockedState.tsx"
import { DashPageHeader } from "../../../ui/DashPageHeader.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { DashBoxOfficeStateCreate, type DashBoxOfficeRow } from "../DashBoxOfficeStateCreate.ts"
import { dashBoxOfficeKpis } from "../model/dashBoxOfficeKpis.ts"

/** Seite „Abendkasse“: Einstellungen, Preise, KPIs und Verkäufe (ohne `abendkasse.nutzen` gesperrt). */
export function DashBoxOfficePage(p: { eventId: string }) {
  const edit = DashBoxOfficeStateCreate()
  const now = dashNow()

  const event = () => dashEventById(p.eventId)
  const canUse = () => dashCan("abendkasse.nutzen")
  const canPrices = () => dashCan("abendkasse.preise")
  const canRevenue = () => dashCan("umsatz.sehen")

  const orders = () => dashStateGet().orders.filter((order) => order.eventId === p.eventId)
  const tickets = () => dashStateGet().tickets.filter((ticket) => ticket.eventId === p.eventId)
  const sales = () =>
    dashStateGet()
      .boxOfficeSales.filter((sale) => sale.eventId === p.eventId)
      .sort((left, right) => Date.parse(right.createdAt) - Date.parse(left.createdAt))

  const kpis = () => dashBoxOfficeKpis({ orders: orders(), sales: sales(), eventId: p.eventId, now: now() })

  const priceRows = (): DashBoxOfficeRow[] => {
    const currentOrders = orders()
    const currentTickets = tickets()
    return dashStateGet()
      .ticketTypes.filter((type) => type.eventId === p.eventId && type.channel === "abendkasse")
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((type) => {
        const stats = dashTicketTypeSales({ ticketType: type, orders: currentOrders, tickets: currentTickets })
        return {
          type,
          priceCents: type.phases[0]?.priceCents ?? 0,
          sold: stats.sold,
          remaining: stats.available,
        }
      })
  }

  const toggleEnabled = (checked: boolean) => {
    const current = event()
    if (!current) return
    const result = dashEventPatch(
      current.id,
      {
        boxOffice: {
          enabled: checked,
          opensAt: checked ? (current.boxOffice.opensAt ?? current.doorsAt) : current.boxOffice.opensAt,
        },
      },
      { action: checked ? "Abendkasse aktiviert" : "Abendkasse deaktiviert" },
    )
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: checked ? "Abendkasse aktiviert" : "Abendkasse deaktiviert", variant: "success" })
  }

  const saveOpensAt = (iso: string | null) => {
    const current = event()
    if (!current) return
    const result = dashBoxOfficeConfigSet(
      current.id,
      { enabled: current.boxOffice.enabled, opensAt: iso },
      { action: "Öffnungszeit der Abendkasse geändert" },
    )
    if (!result.success) toastAdd({ title: result.errorMessage, variant: "error" })
    else toastAdd({ title: "Öffnungszeit gespeichert", variant: "success" })
  }

  const startEdit = (row: DashBoxOfficeRow) => {
    edit.editingId.set(row.type.id)
    edit.name.set(row.type.name)
    edit.priceCents.set(row.priceCents)
    edit.capacity.set(String(row.type.capacity))
  }

  const cancelEdit = () => {
    edit.editingId.set(null)
  }

  const saveEdit = (type: DashTicketType, sold: number) => {
    const name = edit.name.get().trim()
    const priceCents = edit.priceCents.get()
    const capacity = Number.parseInt(edit.capacity.get().replace(/[^0-9]/g, ""), 10)
    if (name === "") {
      toastAdd({ title: "Gib einen Namen für den Preis ein.", variant: "error" })
      return
    }
    if (priceCents === null || priceCents < 0) {
      toastAdd({ title: "Gib einen gültigen Preis ein.", variant: "error" })
      return
    }
    if (!Number.isInteger(capacity) || capacity < sold) {
      toastAdd({ title: `Das Kontingent muss mindestens ${sold} betragen (bereits verkauft).`, variant: "error" })
      return
    }
    const result = dashTicketTypeUpsert({
      id: type.id,
      eventId: type.eventId,
      name,
      description: type.description,
      channel: type.channel,
      hidden: type.hidden,
      capacity,
      maxPerOrder: type.maxPerOrder,
      taxRateBps: type.taxRateBps,
      sortOrder: type.sortOrder,
      archivedAt: type.archivedAt,
      salesStartAt: type.salesStartAt,
      salesEndAt: type.salesEndAt,
      phases: type.phases.map((phase, index) => (index === 0 ? { ...phase, priceCents } : { ...phase })),
    })
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    edit.editingId.set(null)
    toastAdd({ title: "Preis gespeichert", variant: "success" })
  }

  const addPrice = () => {
    const result = dashBoxOfficeTicketAdd(p.eventId)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: "Abendkassen-Preis angelegt", variant: "success" })
    const stats = dashTicketTypeSales({ ticketType: result.data, orders: orders(), tickets: tickets() })
    startEdit({
      type: result.data,
      priceCents: result.data.phases[0]?.priceCents ?? 0,
      sold: stats.sold,
      remaining: stats.available,
    })
  }

  const downloadPoster = () => {
    const current = event()
    if (!current || edit.posterBusy.get()) return
    edit.posterBusy.set(true)
    void import("../model/dashBoxOfficePosterPdf.ts").then((module) =>
      module
        .dashBoxOfficePosterPdf({
          title: current.title,
          dateLine: dashDateFormat(current.startsAt, "lang"),
          eventId: current.id,
        })
        .then((result) => {
          if (!result.success) {
            toastAdd({ title: result.errorMessage, variant: "error" })
            return
          }
          dashDownload(dashFileNameCreate(["Kassen-QR", current.title], "pdf", now()), result.data, "application/pdf")
          toastAdd({ title: "Kassen-QR gespeichert", variant: "success" })
        })
        .finally(() => edit.posterBusy.set(false)),
    )
  }

  const saleColumns = (): DataTableColumn<DashBoxOfficeSale>[] => [
    {
      id: "zeit",
      header: "Zeit",
      cell: (sale) => <span class="whitespace-nowrap text-sm">{dashDateFormat(sale.createdAt, "kurz")}</span>,
      sortValue: (sale) => sale.createdAt,
    },
    {
      id: "tickets",
      header: "Tickets",
      align: "right",
      cell: (sale) => <span>{sale.lines.reduce((sum, line) => sum + line.quantity, 0)}</span>,
      sortValue: (sale) => sale.lines.reduce((sum, line) => sum + line.quantity, 0),
    },
    {
      id: "betrag",
      header: "Betrag",
      align: "right",
      cell: (sale) => <DashMoney cents={sale.totalCents} />,
      sortValue: (sale) => sale.totalCents,
    },
    {
      id: "status",
      header: "Status",
      cell: (sale) => <DashStatusPill kind="boxOffice" value={sale.status} />,
      sortValue: (sale) => sale.status,
    },
    {
      id: "email",
      header: "Käufer-E-Mail",
      cell: (sale) => <span class="truncate text-sm text-content-muted">{sale.buyerEmail ?? "—"}</span>,
      sortValue: (sale) => sale.buyerEmail ?? "",
      hideBelow: "md",
    },
  ]

  return (
    <Show
      when={canUse()}
      fallback={<DashLockedState description="Die Abendkasse sehen nur Rollen mit Zugriff auf die Abendkasse." />}
    >
      <Show when={event()}>
        {(current) => (
          <div>
            <DashPageHeader
              title="Abendkasse"
              description="Kassen-Tickets und offene Vorgänge."
              actions={
                <>
                  <LinkButtonInternal
                    to={`/demo/kasse/${current().id}`}
                    newTab
                    variant={buttonVariant.contrast}
                    icon={mdiCashRegister}
                    iconRight={mdiOpenInNew}
                    iconClass="size-4"
                    class="h-9 gap-1.5 px-3 text-sm"
                  >
                    Kassenmodus öffnen
                  </LinkButtonInternal>
                  <Button
                    type="button"
                    variant={buttonVariant.outline}
                    class="h-9 px-3 text-sm"
                    onClick={downloadPoster}
                    disabled={edit.posterBusy.get()}
                  >
                    <Icon path={mdiPrinterOutline} class="mr-2 size-4" />
                    Kassen-QR drucken
                  </Button>
                </>
              }
            />
            <div class="flex flex-col gap-6">
              <div class="grid grid-cols-2 gap-3 lg:grid-cols-3">
                <DashKpiCard label="Heute verkauft" value={String(kpis().todayTickets)} icon={mdiTicketOutline} />
                <Show when={canRevenue()}>
                  <DashKpiCard
                    label="Umsatz Abendkasse"
                    value={dashCentsFormat(kpis().todayRevenueCents)}
                    icon={mdiCashMultiple}
                  />
                </Show>
                <DashKpiCard label="Offene Vorgänge" value={String(kpis().openCount)} icon={mdiClockOutline} />
              </div>
              <DashSection
                title="Einstellungen"
                description="Schalte die Kasse für den Einlass frei und lege fest, ab wann sie öffnet."
              >
                <div class="flex flex-col gap-4">
                  <ToggleSwitch
                    checked={current().boxOffice.enabled}
                    onChange={toggleEnabled}
                    label="Abendkasse aktiv"
                    description="Gäste können an der Abendkasse per Handy zahlen."
                  />
                  <DashField label="Öffnet um" hint="Voreingestellt ist der Einlass.">
                    <DashDateTimeInput
                      valueIso={current().boxOffice.opensAt ?? current().doorsAt}
                      onChange={saveOpensAt}
                    />
                  </DashField>
                  <div>
                    <span class="inline-flex items-center gap-1.5 rounded-full bg-surface-muted px-2 py-0.5 text-xs text-content-muted">
                      <Icon path={mdiCreditCardOutline} class="size-3.5" />
                      Nur bargeldlos · Zahlung am Gast-Handy
                    </span>
                  </div>
                </div>
              </DashSection>
              <DashSection
                title="Preise"
                description="Ticketarten für den Verkauf an der Abendkasse."
                actions={
                  <Show when={canPrices()}>
                    <Button type="button" variant={buttonVariant.outline} class="h-9 px-3 text-sm" onClick={addPrice}>
                      <Icon path={mdiPlus} class="mr-2 size-4" />
                      Preis hinzufügen
                    </Button>
                  </Show>
                }
              >
                <Show
                  when={priceRows().length > 0}
                  fallback={<p class="text-sm text-content-muted">Noch keine Abendkassen-Preise angelegt.</p>}
                >
                  <ul class="flex flex-col gap-3">
                    <For each={priceRows()}>
                      {(row) => (
                        <li class="rounded-card border border-border-subtle bg-surface-muted/40 p-3 sm:p-4">
                          <Show
                            when={edit.editingId.get() === row.type.id && canPrices()}
                            fallback={
                              <div class="flex flex-wrap items-center justify-between gap-2">
                                <div class="min-w-0">
                                  <p class="truncate text-sm font-medium">{row.type.name}</p>
                                  <p class="mt-0.5 text-sm text-content-muted">
                                    <DashMoney cents={row.priceCents} />
                                    {` · Kontingent ${row.type.capacity} · ${row.sold} verkauft · ${row.remaining} frei`}
                                  </p>
                                </div>
                                <Show
                                  when={canPrices()}
                                  fallback={
                                    <span class="inline-flex items-center gap-1.5 text-xs text-content-muted">
                                      <Icon path={mdiLockOutline} class="size-4" />
                                      Preise legt der Veranstalter fest
                                    </span>
                                  }
                                >
                                  <Button
                                    type="button"
                                    variant={buttonVariant.outline}
                                    class="h-9 px-3 text-sm"
                                    onClick={() => startEdit(row)}
                                  >
                                    <Icon path={mdiPencilOutline} class="mr-2 size-4" />
                                    Bearbeiten
                                  </Button>
                                </Show>
                              </div>
                            }
                          >
                            <div class="grid gap-3 sm:grid-cols-3">
                              <DashField label="Name" for={`boxoffice-name-${row.type.id}`}>
                                <Input
                                  id={`boxoffice-name-${row.type.id}`}
                                  class="h-10 text-sm rounded-control"
                                  value={edit.name.get()}
                                  onInput={(event) => edit.name.set(event.currentTarget.value)}
                                />
                              </DashField>
                              <DashField label="Preis" for={`boxoffice-price-${row.type.id}`}>
                                <DashMoneyInput
                                  id={`boxoffice-price-${row.type.id}`}
                                  valueCents={edit.priceCents.get()}
                                  onChange={(cents) => edit.priceCents.set(cents)}
                                />
                              </DashField>
                              <DashField label="Kontingent" for={`boxoffice-capacity-${row.type.id}`}>
                                <Input
                                  id={`boxoffice-capacity-${row.type.id}`}
                                  class="h-10 text-sm tabular-nums rounded-control"
                                  inputmode="numeric"
                                  value={edit.capacity.get()}
                                  onInput={(event) =>
                                    edit.capacity.set(event.currentTarget.value.replace(/[^0-9]/g, ""))
                                  }
                                />
                              </DashField>
                            </div>
                            <div class="mt-3 flex justify-end gap-2">
                              <Button
                                type="button"
                                variant={buttonVariant.outline}
                                class="h-9 px-3 text-sm"
                                onClick={cancelEdit}
                              >
                                Abbrechen
                              </Button>
                              <Button
                                type="button"
                                variant={buttonVariant.contrast}
                                class="h-9 px-3 text-sm"
                                onClick={() => saveEdit(row.type, row.sold)}
                              >
                                <Icon path={mdiCheck} class="mr-2 size-4" />
                                Speichern
                              </Button>
                            </div>
                          </Show>
                        </li>
                      )}
                    </For>
                  </ul>
                </Show>
                <Show when={!canPrices()}>
                  <p class="mt-3 inline-flex items-center gap-1.5 text-xs text-content-muted">
                    <Icon path={mdiLockOutline} class="size-4" />
                    Preise legt der Veranstalter fest
                  </p>
                </Show>
              </DashSection>
              <DashSection title="Verkäufe" description="Alle Vorgänge dieser Abendkasse, neueste zuerst.">
                <DataTable
                  rows={sales()}
                  rowKey={(sale) => sale.id}
                  columns={saleColumns()}
                  ariaLabel="Abendkassen-Verkäufe"
                  initialSort={{ columnId: "zeit", direction: "desc" }}
                  empty={<span class="text-sm text-content-muted">Noch keine Verkäufe an dieser Abendkasse.</span>}
                />
              </DashSection>
            </div>
          </div>
        )}
      </Show>
    </Show>
  )
}
