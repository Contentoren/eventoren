import { mdiAlphaPCircleOutline } from "@adaptive-ds/mdi/mdiAlphaPCircleOutline.js"
import { mdiApple } from "@adaptive-ds/mdi/mdiApple.js"
import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiCreditCardOutline } from "@adaptive-ds/mdi/mdiCreditCardOutline.js"
import { mdiGiftOutline } from "@adaptive-ds/mdi/mdiGiftOutline.js"
import { mdiGoogle } from "@adaptive-ds/mdi/mdiGoogle.js"
import { mdiReceiptTextOutline } from "@adaptive-ds/mdi/mdiReceiptTextOutline.js"
import { mdiTicketConfirmationOutline } from "@adaptive-ds/mdi/mdiTicketConfirmationOutline.js"
import { createMemo, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { DataTable } from "#ui/table/data/DataTable.jsx"
import type { DataTableColumn } from "#ui/table/data/DataTableColumn.js"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashPaymentMethod } from "../../../model/dashPaymentMethodSchema.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { DashRelativeTime } from "../../../ui/time/DashRelativeTime.tsx"
import type { DashOrderListRow } from "../model/dashOrderListFilter.ts"
import { dashPaymentMethodLabel } from "../model/dashPaymentMethodLabel.ts"
import { DashOrderBuyerDialog } from "./actions/DashOrderBuyerDialog.tsx"
import { DashOrderCancelDialog } from "./actions/DashOrderCancelDialog.tsx"
import { DashOrderRefundDialog } from "./actions/DashOrderRefundDialog.tsx"
import { DashTicketHolderDialog } from "./actions/DashTicketHolderDialog.tsx"
import { dashOrderSheetActionsStateCreate } from "./actions/dashOrderSheetActionsStateCreate.ts"
import { DashOrderSheet } from "./DashOrderSheet.tsx"

const methodIcon: Record<DashPaymentMethod, string> = {
  karte: mdiCreditCardOutline,
  paypal: mdiAlphaPCircleOutline,
  sepa: mdiBankOutline,
  applepay: mdiApple,
  googlepay: mdiGoogle,
  gutschein: mdiGiftOutline,
  kostenlos: mdiTicketConfirmationOutline,
}

export interface DashOrdersListProps {
  rows: DashOrderListRow[]
  visibleCount: number
  showEvent: boolean
  activeOrder: DashOrder | null
  activeEventTitle: string
  activeTickets: DashTicket[]
  ticketTypeName: (ticketTypeId: string) => string | null
  onSelect: (row: DashOrderListRow) => void
  onSheetOpenChange: (open: boolean) => void
  empty: () => string
  onResetFilter: () => void
  footer?: () => { shown: number; total: number; onMore: () => void } | null
}

/** Bestelltabelle mit Zahlart-Icons, Status-Pills, Karten auf Mobil und Detail-Sheet. */
export function DashOrdersList(p: DashOrdersListProps) {
  const columns = (): DataTableColumn<DashOrderListRow>[] => {
    const list: DataTableColumn<DashOrderListRow>[] = [
      {
        id: "number",
        header: "Nummer",
        cell: (row) => <span class="font-mono text-[13px]">{row.order.number}</span>,
        sortValue: (row) => row.order.number,
      },
      {
        id: "buyer",
        header: "Käufer",
        cell: (row) => (
          <span class="flex min-w-0 flex-col">
            <span class="truncate font-medium">{row.buyerName}</span>
            <span class="truncate text-xs text-content-muted">{row.order.buyer.email}</span>
          </span>
        ),
        sortValue: (row) => `${row.buyerName} ${row.order.buyer.email}`,
      },
    ]
    if (p.showEvent) {
      list.push({
        id: "event",
        header: "Event",
        cell: (row) => <span class="truncate">{row.eventTitle}</span>,
        sortValue: (row) => row.eventTitle,
        hideBelow: "lg",
      })
    }
    list.push(
      {
        id: "tickets",
        header: "Tickets",
        align: "right",
        cell: (row) => <span>{row.ticketCount}</span>,
        sortValue: (row) => row.ticketCount,
        hideBelow: "sm",
      },
      {
        id: "total",
        header: "Betrag",
        align: "right",
        cell: (row) => <DashMoney cents={row.order.totalCents} />,
        sortValue: (row) => row.order.totalCents,
      },
      {
        id: "method",
        header: "Zahlart",
        cell: (row) => (
          <span
            class="inline-flex items-center gap-1.5 text-content-muted"
            title={dashPaymentMethodLabel[row.order.payment.method]}
          >
            <Icon path={methodIcon[row.order.payment.method]} class="size-4 shrink-0" />
            <span class="whitespace-nowrap">{dashPaymentMethodLabel[row.order.payment.method]}</span>
          </span>
        ),
        hideBelow: "md",
      },
      {
        id: "date",
        header: "Datum",
        align: "right",
        cell: (row) => <DashRelativeTime iso={row.order.createdAt} />,
        sortValue: (row) => Date.parse(row.order.createdAt),
        hideBelow: "sm",
      },
      {
        id: "status",
        header: "Status",
        cell: (row) => <DashStatusPill kind="order" value={row.order.status} />,
      },
    )
    return list
  }

  const visibleRows = () => p.rows.slice(0, p.visibleCount)
  const footerState = () => p.footer?.() ?? null
  const state = () => dashStateGet()
  const org = () =>
    state().orgs.find((entry) => p.activeOrder !== null && entry.id === p.activeOrder.orgId) ?? state().orgs[0] ?? null

  const sheetState = createMemo(() => {
    const live = p.activeOrder
    const orderId = live?.id ?? null
    if (!orderId || !live) return null
    const fallback: DashOrder = live
    return dashOrderSheetActionsStateCreate({
      order: () => dashStateGet().orders.find((candidate) => candidate.id === orderId) ?? fallback,
      tickets: () => dashStateGet().tickets.filter((ticket) => ticket.orderId === orderId),
      ticketTypeName: p.ticketTypeName,
    })
  })

  return (
    <>
      <DataTable
        rows={visibleRows()}
        rowKey={(row) => row.order.id}
        columns={columns()}
        ariaLabel="Bestellungen"
        onRowClick={p.onSelect}
        activeRowKey={p.activeOrder?.id ?? null}
        mobileCard={(row) => (
          <div class="flex flex-col gap-1 text-sm">
            <div class="flex items-center justify-between gap-2">
              <span class="font-mono text-[13px]">{row.order.number}</span>
              <DashStatusPill kind="order" value={row.order.status} />
            </div>
            <div class="truncate font-medium">{row.buyerName}</div>
            <Show when={p.showEvent}>
              <div class="truncate text-xs text-content-muted">{row.eventTitle}</div>
            </Show>
            <div class="flex items-center justify-between gap-2 text-content-muted">
              <span>
                {row.ticketCount} {row.ticketCount === 1 ? "Ticket" : "Tickets"} ·{" "}
                {dashPaymentMethodLabel[row.order.payment.method]} · <DashRelativeTime iso={row.order.createdAt} />
              </span>
              <DashMoney cents={row.order.totalCents} />
            </div>
          </div>
        )}
        empty={
          <span class="inline-flex flex-col items-center gap-2">
            <Icon path={mdiReceiptTextOutline} class="size-7 text-content-muted" />
            <span>{p.empty()}</span>
            <Button variant={buttonVariant.link} class="h-auto px-0 text-sm" onClick={p.onResetFilter}>
              Filter zurücksetzen
            </Button>
          </span>
        }
        footer={
          footerState() ? (
            <div class="flex items-center justify-between gap-2 text-sm text-content-muted">
              <span>
                {footerState()?.shown} von {footerState()?.total}
              </span>
              <Show when={(footerState()?.shown ?? 0) < (footerState()?.total ?? 0)}>
                <Button
                  variant={buttonVariant.link}
                  class="h-auto px-0 text-sm"
                  onClick={() => footerState()?.onMore()}
                >
                  Mehr laden
                </Button>
              </Show>
            </div>
          ) : undefined
        }
      />
      <Show when={p.activeOrder !== null && org() !== null && sheetState() !== null}>
        <DashOrderSheet
          order={p.activeOrder!}
          tickets={p.activeTickets}
          ticketTypeName={p.ticketTypeName}
          eventTitle={p.activeEventTitle}
          org={org()!}
          open={p.activeOrder !== null}
          onOpenChange={p.onSheetOpenChange}
          actions={sheetState()?.actions}
          notesState={sheetState()!.notesState}
          sessionUserName={sheetState()?.sessionUserName() ?? null}
          onDeleteNote={(noteId, author) => sheetState()?.noteDelete(p.activeOrder!, noteId, author)}
          dialogs={
            <>
              <DashOrderRefundDialog
                open={sheetState()?.dialog.get() === "refund"}
                onOpenChange={(open) => {
                  if (!open) sheetState()?.dialog.set(null)
                }}
                orderNumber={p.activeOrder?.number ?? ""}
                state={sheetState()!.refundState}
                ticketTypeName={p.ticketTypeName}
                onSubmit={() => sheetState()?.refundSubmit()}
              />
              <DashOrderCancelDialog
                open={sheetState()?.dialog.get() === "cancel"}
                onOpenChange={(open) => {
                  if (!open) sheetState()?.dialog.set(null)
                }}
                orderNumber={p.activeOrder?.number ?? ""}
                orderStatus={p.activeOrder?.status ?? "bezahlt"}
                state={sheetState()!.cancelState}
                onSubmit={() => sheetState()?.cancelSubmit()}
              />
              <DashOrderBuyerDialog
                open={sheetState()?.dialog.get() === "buyer"}
                onOpenChange={(open) => {
                  if (!open) sheetState()?.dialog.set(null)
                }}
                orderNumber={p.activeOrder?.number ?? ""}
                state={sheetState()!.buyerState}
                onSubmit={() => sheetState()?.buyerSubmit()}
              />
              <DashTicketHolderDialog
                open={sheetState()?.dialog.get() === "holder"}
                onOpenChange={(open) => {
                  if (!open) sheetState()?.dialog.set(null)
                }}
                ticket={sheetState()?.holderTicket() ?? null}
                ticketTypeLabel={
                  sheetState()?.holderTicket()
                    ? (p.ticketTypeName(sheetState()?.holderTicket()?.ticketTypeId ?? "") ?? null)
                    : null
                }
                state={sheetState()!.holderState}
                onSubmit={() => sheetState()?.holderSubmit()}
              />
            </>
          }
        />
      </Show>
    </>
  )
}
