import { mdiInboxOutline } from "@adaptive-ds/mdi/mdiInboxOutline.js"
import { Show } from "solid-js"
import { Badge } from "#ui/static/badge/Badge.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { Input } from "#ui/input/input/Input.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import { eventDateFormat } from "../../events/eventDateFormat.ts"
import { eventPriceFormat } from "../../events/eventPriceFormat.ts"
import { eventTimeFormat } from "../../events/eventTimeFormat.ts"
import { UiContainer } from "../../ui/UiContainer.tsx"
import {
  type UiKitTabelleOrder,
  type UiKitTabelleOrderStatus,
  uiKitTabelleGalleryStateCreate,
} from "./uiKitTabelleGalleryStateCreate.ts"

const statusVariant: Record<UiKitTabelleOrderStatus, "filledGreen" | "subtle" | "filledRed" | "contrast"> = {
  bezahlt: "filledGreen",
  offen: "subtle",
  storniert: "filledRed",
  erstattet: "contrast",
  teilerstattet: "contrast",
}

const statusLabel: Record<UiKitTabelleOrderStatus, string> = {
  bezahlt: "Bezahlt",
  offen: "Offen",
  storniert: "Storniert",
  erstattet: "Erstattet",
  teilerstattet: "Teilerstattet",
}

const columns: DataTableColumn<UiKitTabelleOrder>[] = [
  {
    id: "number",
    header: "Nummer",
    cell: (row) => <span class="font-mono text-[13px]">{row.number}</span>,
    sortValue: (row) => row.number,
    width: "w-32",
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
    width: "w-20",
    hideBelow: "sm",
  },
  {
    id: "total",
    header: "Betrag",
    align: "right",
    cell: (row) => <span>{eventPriceFormat(row.totalCents)}</span>,
    sortValue: (row) => row.totalCents,
    width: "w-28",
  },
  {
    id: "date",
    header: "Datum",
    align: "right",
    cell: (row) => (
      <span title={`${eventDateFormat(row.createdAt)} · ${eventTimeFormat(row.createdAt)}`}>
        {eventDateFormat(row.createdAt)}
      </span>
    ),
    sortValue: (row) => row.createdAt,
    hideBelow: "md",
    width: "w-32",
  },
  {
    id: "status",
    header: "Status",
    align: "right",
    cell: (row) => (
      <Badge variant={statusVariant[row.status]}>
        <span class="mr-1.5 inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
        {statusLabel[row.status]}
      </Badge>
    ),
    headerClass: "text-right",
    width: "w-36",
  },
]

/** Gallery for the generic DataTable: search, sorting, selection with bulk actions, loading, and mobile cards. */
export function UiKitTabelleGallery() {
  const state = uiKitTabelleGalleryStateCreate()

  const searchSubmit = (event: SubmitEvent) => event.preventDefault()

  const toastRowClick = (order: UiKitTabelleOrder) => {
    toastAdd({
      title: `${order.number} geöffnet`,
      description: `${order.buyerName} · ${eventPriceFormat(order.totalCents)}`,
    })
  }

  const toastExport = () => {
    toastAdd({ title: "Export gestartet", description: `${state.filtered().length} Bestellungen werden exportiert.` })
  }

  const toastResend = (keys: string[]) => {
    toastAdd({
      title: "Tickets erneut gesendet",
      description: `${keys.length} ${keys.length === 1 ? "Bestellung" : "Bestellungen"}`,
    })
  }

  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
        <header class="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 class="text-xl font-semibold tracking-tight text-content sm:text-2xl">Tabelle</h1>
            <p class="mt-1 text-sm text-content-muted">
              Generische Datentabelle: Sortieren, Auswählen, mobil als Karten.
            </p>
          </div>
          <div class="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={toastExport}>
              Exportieren
            </Button>
          </div>
        </header>
        <section
          class="flex flex-col gap-4 rounded-card border border-border-subtle bg-surface p-4 sm:p-5"
          aria-label="Steuerung"
        >
          <form class="flex min-w-0 flex-col gap-2 sm:flex-row" onSubmit={searchSubmit} role="search">
            <div class="relative min-w-0 flex-1">
              <Input
                type="search"
                aria-label="Bestellungen suchen"
                placeholder="Nummer, Name oder E-Mail suchen …"
                class="w-full pr-10"
                value={state.search.get()}
                onInput={(event) => state.searchChange(event.currentTarget.value)}
              />
            </div>
            <Show when={state.search.get()}>
              <Button variant="ghost" size="sm" onClick={state.searchClear}>
                Filter zurücksetzen
              </Button>
            </Show>
          </form>
          <div class="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm text-content">
            <label class="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                class="size-4 accent-current"
                checked={state.loading.get()}
                onChange={(event) => state.loadingChange(event.currentTarget.checked)}
              />
              Laden
            </label>
            <label class="inline-flex cursor-pointer items-center gap-2">
              <input
                type="checkbox"
                class="size-4 accent-current"
                checked={state.showEmpty.get()}
                onChange={(event) => state.emptyChange(event.currentTarget.checked)}
              />
              Leer
            </label>
          </div>
        </section>
        <DataTable<UiKitTabelleOrder>
          rows={state.filtered()}
          rowKey={(row) => row.id}
          columns={columns}
          ariaLabel="Bestellungen"
          onRowClick={(row) => {
            state.rowOpen(row)
            toastRowClick(row)
          }}
          activeRowKey={state.activeRowKey.get()}
          selectable
          selectedKeys={state.selectedKeys.get()}
          onSelectedKeysChange={state.selectionChange}
          bulkActions={(keys) => (
            <span class="inline-flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => toastResend(keys)}>
                Tickets senden
              </Button>
              <Button variant="outline" size="sm" onClick={toastExport}>
                Exportieren
              </Button>
            </span>
          )}
          initialSort={{ columnId: "date", direction: "desc" }}
          mobileCard={(row) => (
            <span class="flex flex-col gap-1">
              <span class="flex items-baseline justify-between gap-3">
                <span class="font-mono text-[13px] font-semibold text-content">{row.number}</span>
                <Badge variant={statusVariant[row.status]}>
                  <span class="mr-1.5 inline-block size-1.5 rounded-full bg-current" aria-hidden="true" />
                  {statusLabel[row.status]}
                </Badge>
              </span>
              <span class="text-sm text-content">
                {row.buyerName} · {row.tickets} {row.tickets === 1 ? "Ticket" : "Tickets"} ·{" "}
                {eventPriceFormat(row.totalCents)}
              </span>
              <span class="text-xs text-content-muted">
                {eventDateFormat(row.createdAt)} · {eventTimeFormat(row.createdAt)}
              </span>
            </span>
          )}
          loading={state.loading.get()}
          empty={
            <span class="inline-flex flex-col items-center gap-3">
              <span class="inline-flex size-11 items-center justify-center rounded-full bg-surface-muted text-content-muted">
                <svg viewBox="0 0 24 24" class="size-6 fill-current" aria-hidden="true">
                  <path d={mdiInboxOutline} />
                </svg>
              </span>
              <Show when={state.search.get()} fallback={<span>Keine Einträge</span>}>
                <span>Keine Treffer – passe die Suche an.</span>
              </Show>
              <Show when={state.search.get()}>
                <Button variant="outline" size="sm" onClick={state.searchClear}>
                  Filter zurücksetzen
                </Button>
              </Show>
            </span>
          }
        />
        <Show when={state.activeRowKey.get()}>
          <p class="text-sm text-content-muted">
            Geöffnete Bestellung: <span class="font-mono">{state.activeRowKey.get()}</span> ·{" "}
            <Button variant="ghost" size="sm" class="px-1 text-sm underline" onClick={state.activeRowClear}>
              Schließen
            </Button>
          </p>
        </Show>
      </UiContainer>
    </main>
  )
}
