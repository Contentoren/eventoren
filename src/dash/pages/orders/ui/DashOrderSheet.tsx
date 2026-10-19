import { mdiCashRefund } from "@adaptive-ds/mdi/mdiCashRefund.js"
import { mdiDotsVertical } from "@adaptive-ds/mdi/mdiDotsVertical.js"
import { mdiEmailFastOutline } from "@adaptive-ds/mdi/mdiEmailFastOutline.js"
import { mdiFileDocumentOutline } from "@adaptive-ds/mdi/mdiFileDocumentOutline.js"
import { mdiPencil } from "@adaptive-ds/mdi/mdiPencil.js"
import type { JSX } from "solid-js"
import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIcon } from "#ui/interactive/button/ButtonIcon.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { CopyButton } from "#ui/interactive/copy/CopyButton.jsx"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Sheet } from "#ui/interactive/sheet/Sheet.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import { dashTaxCompute } from "../../../model/dashTaxCompute.ts"
import type { DashTicket } from "../../../model/dashTicketSchema.ts"
import { DashDescriptionList } from "../../../ui/layout/DashDescriptionList.tsx"
import { DashMoney } from "../../../ui/money/DashMoney.tsx"
import { DashStatusPill } from "../../../ui/status/DashStatusPill.tsx"
import { DashRelativeTime } from "../../../ui/time/DashRelativeTime.tsx"
import { dashOrderTimelineCreate } from "../model/dashOrderTimelineCreate.ts"
import { dashPaymentMethodLabel } from "../model/dashPaymentMethodLabel.ts"
import { DashOrderNotesSection } from "./actions/DashOrderNotesSection.tsx"
import type { DashOrderNotesState } from "./actions/dashOrderNotesStateCreate.ts"
import { DashOrderVoucherBadge } from "./DashOrderVoucherBadge.tsx"

export interface DashOrderSheetActions {
  resend: (order: DashOrder) => void
  invoice: (order: DashOrder) => void
  refund: (order: DashOrder) => void
  cancel: (order: DashOrder) => void
  editBuyer: (order: DashOrder) => void
  editHolder: (order: DashOrder, ticket: DashTicket) => void
  addNote: (order: DashOrder, text: string) => void
  deleteNote: (order: DashOrder, noteId: string, author: string) => void
}

export interface DashOrderSheetProps {
  order: DashOrder
  tickets: DashTicket[]
  ticketTypeName: (ticketTypeId: string) => string | null
  eventTitle: string
  org: DashOrg
  open: boolean
  onOpenChange: (open: boolean) => void
  actions?: Partial<DashOrderSheetActions>
  notesState: DashOrderNotesState
  sessionUserName: string | null
  onDeleteNote: (noteId: string, author: string) => void
  dialogs?: JSX.Element
}

function ticketCheckinLabel(ticket: DashTicket): string {
  if (!ticket.checkedInAt) return "Nicht eingecheckt"
  const time = dashDateFormat(ticket.checkedInAt, "zeit")
  return ticket.entrance ? `Eingecheckt ${time} · ${ticket.entrance}` : `Eingecheckt ${time}`
}

/** Bestell-Detailpanel: Kopf, Käufer, Tickets (mit Umschreiben), Zahlung, Notizen, Verlauf, Aktionsdialoge. */
export function DashOrderSheet(p: DashOrderSheetProps) {
  const timeline = () => dashOrderTimelineCreate({ order: p.order, tickets: p.tickets })
  const totalTickets = () => p.order.lines.reduce((sum, line) => sum + line.quantity, 0)
  const refundsTotal = () =>
    p.order.refunds.reduce((sum, refund) => sum + refund.amountCents - (refund.feeCents ?? 0), 0)

  const taxRows = () => {
    const byRate = new Map<number, number>()
    for (const line of p.order.lines) {
      byRate.set(line.taxRateBps, (byRate.get(line.taxRateBps) ?? 0) + line.unitPriceCents * line.quantity)
    }
    return [...byRate.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([rateBps, grossCents]) => {
        const computed = dashTaxCompute({ grossCents, rateBps, status: p.org.tax.status })
        return { rateBps, grossCents, taxCents: computed.taxCents }
      })
  }

  return (
    <Sheet
      open={p.open}
      onOpenChange={p.onOpenChange}
      size="lg"
      title={`Bestellung ${p.order.number}`}
      description={p.eventTitle}
      headerActions={<DashStatusPill kind="order" value={p.order.status} />}
      footer={
        <div class="flex w-full flex-wrap items-center justify-end gap-2">
          <Show when={p.actions?.resend}>
            <ButtonIcon
              variant={buttonVariant.outline}
              icon={mdiEmailFastOutline}
              iconClass="size-4 mr-1.5"
              class="h-9 px-3 text-sm"
              onClick={() => p.actions?.resend?.(p.order)}
            >
              Tickets erneut senden
            </ButtonIcon>
          </Show>
          <Show when={p.actions?.invoice}>
            <ButtonIcon
              variant={buttonVariant.outline}
              icon={mdiFileDocumentOutline}
              iconClass="size-4 mr-1.5"
              class="h-9 px-3 text-sm"
              onClick={() => p.actions?.invoice?.(p.order)}
            >
              Rechnung (PDF)
            </ButtonIcon>
          </Show>
          <Show when={p.actions?.refund}>
            <ButtonIcon
              variant={buttonVariant.outline}
              icon={mdiCashRefund}
              iconClass="size-4 mr-1.5"
              class="h-9 px-3 text-sm"
              onClick={() => p.actions?.refund?.(p.order)}
            >
              Erstatten
            </ButtonIcon>
          </Show>
          <Show when={p.actions?.cancel}>
            <DropdownMenu
              items={[
                {
                  type: "item",
                  id: "stornieren",
                  label: "Stornieren",
                  icon: mdiCashRefund,
                  tone: "danger",
                  onSelect: () => p.actions?.cancel?.(p.order),
                },
              ]}
              triggerIcon={mdiDotsVertical}
              triggerAriaLabel="Weitere Aktionen"
            />
          </Show>
        </div>
      }
    >
      <div class="flex flex-col gap-6">
        <div class="flex flex-wrap items-baseline justify-between gap-2 border border-border-subtle rounded-control bg-surface-muted px-4 py-3">
          <div class="text-xs text-content-muted">
            <DashRelativeTime iso={p.order.createdAt} /> · {dashDateFormat(p.order.createdAt, "lang")}
          </div>
          <div class="text-2xl font-semibold tabular-nums">
            <DashMoney cents={p.order.totalCents} />
          </div>
        </div>

        <section aria-label="Käufer">
          <h2 class="text-sm font-semibold">Käufer</h2>
          <div class="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
            <span class="font-medium">{`${p.order.buyer.firstName} ${p.order.buyer.lastName}`.trim()}</span>
            <span class="text-content-muted">{p.order.buyer.email}</span>
            <CopyButton value={p.order.buyer.email} size="sm" />
            <Show when={p.actions?.editBuyer}>
              <Button
                variant={buttonVariant.link}
                class="h-auto px-0 text-xs"
                onClick={() => p.actions?.editBuyer?.(p.order)}
              >
                Käuferdaten bearbeiten
              </Button>
            </Show>
          </div>
        </section>

        <section aria-label="Tickets">
          <h2 class="text-sm font-semibold">Tickets · {totalTickets()}</h2>
          <ul class="mt-2 flex flex-col gap-2">
            <For each={p.tickets}>
              {(ticket) => (
                <li class="border border-border-subtle rounded-control px-3 py-2 text-sm">
                  <div class="flex flex-wrap items-center justify-between gap-2">
                    <span class="font-mono text-[13px]">{ticket.code}</span>
                    <DashStatusPill kind="ticket" value={ticket.checkedInAt ? "eingecheckt" : ticket.status} />
                  </div>
                  <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-content-muted">
                    <span>
                      {p.ticketTypeName(ticket.ticketTypeId) ?? ticket.ticketTypeId} · {ticket.holderName} ·{" "}
                      {ticket.holderEmail}
                    </span>
                    <Show when={p.actions?.editHolder && ticket.status !== "storniert"}>
                      <Button
                        variant={buttonVariant.link}
                        class="h-auto px-0 text-xs"
                        aria-label={`Ticket ${ticket.code} umschreiben`}
                        title="Umschreiben"
                        onClick={() => p.actions?.editHolder?.(p.order, ticket)}
                      >
                        <Icon path={mdiPencil} class="size-3.5" />
                        Umschreiben
                      </Button>
                    </Show>
                  </div>
                  <div class="mt-0.5 text-xs text-content-muted">{ticketCheckinLabel(ticket)}</div>
                </li>
              )}
            </For>
          </ul>
        </section>

        <section aria-label="Zahlung">
          <h2 class="text-sm font-semibold">Zahlung</h2>
          <dl class="mt-2 flex flex-col gap-1 text-sm">
            <For each={p.order.lines}>
              {(line) => (
                <div class="flex items-baseline justify-between gap-3">
                  <dt class="min-w-0 text-content-muted">
                    {line.quantity} × {line.name}
                  </dt>
                  <dd class="shrink-0 tabular-nums">
                    <DashMoney cents={line.unitPriceCents * line.quantity} />
                  </dd>
                </div>
              )}
            </For>
            <Show when={p.order.discount}>
              {(discount) => (
                <div class="flex items-baseline justify-between gap-3">
                  <dt class="min-w-0 text-content-muted">Rabatt ({discount().code})</dt>
                  <dd class="shrink-0 tabular-nums">
                    <DashMoney cents={-discount().amountCents} signed />
                  </dd>
                </div>
              )}
            </Show>
            <Show when={p.order.voucher}>
              {(voucher) => (
                <div class="flex items-center justify-between gap-3">
                  <dt class="flex min-w-0 items-center gap-1 text-content-muted">
                    <span class="truncate">Gutschein ({voucher().code})</span>
                    <DashOrderVoucherBadge voucher={voucher()} />
                  </dt>
                  <dd class="shrink-0 tabular-nums">
                    <DashMoney cents={-voucher().amountCents} signed />
                  </dd>
                </div>
              )}
            </Show>
            <Show when={p.order.serviceFeeCents > 0}>
              <div class="flex items-baseline justify-between gap-3">
                <dt class="min-w-0 text-content-muted">Servicegebühr</dt>
                <dd class="shrink-0 tabular-nums">
                  <DashMoney cents={p.order.serviceFeeCents} />
                </dd>
              </div>
            </Show>
            <For each={p.order.refunds}>
              {(refund) => (
                <div class="flex items-baseline justify-between gap-3">
                  <dt class="min-w-0 text-content-muted">Erstattung ({refund.reason})</dt>
                  <dd class="shrink-0 tabular-nums">
                    <DashMoney cents={-(refund.amountCents - (refund.feeCents ?? 0))} signed />
                  </dd>
                </div>
              )}
            </For>
            <Show when={p.order.chargeback}>
              {(chargeback) => (
                <div class="flex items-baseline justify-between gap-3">
                  <dt class="min-w-0 text-content-muted">Rückbuchung zzgl. Gebühr</dt>
                  <dd class="shrink-0 tabular-nums">
                    <DashMoney cents={-(chargeback().amountCents + chargeback().feeCents)} signed />
                  </dd>
                </div>
              )}
            </Show>
            <div class="flex items-baseline justify-between gap-3 border-t border-border-subtle pt-1 font-semibold">
              <dt>Summe</dt>
              <dd class="tabular-nums">
                <DashMoney cents={p.order.totalCents - refundsTotal()} />
              </dd>
            </div>
          </dl>
          <div class="mt-3">
            <DashDescriptionList
              items={[
                { label: "Zahlart", value: dashPaymentMethodLabel[p.order.payment.method] },
                { label: "Rechnung", value: p.order.invoiceNumber, mono: true },
              ]}
              columns={2}
            />
          </div>
          <Show
            when={p.org.tax.status === "klein"}
            fallback={
              <ul class="mt-2 flex flex-col gap-0.5 text-xs text-content-muted">
                <For each={taxRows()}>
                  {(row) => (
                    <li>
                      USt {(row.rateBps / 100).toFixed(row.rateBps % 100 === 0 ? 0 : 1).replace(".", ",")} %:{" "}
                      {dashCentsFormat(row.taxCents)}
                    </li>
                  )}
                </For>
              </ul>
            }
          >
            <p class="mt-2 text-xs text-content-muted">Gemäß § 19 UStG wird keine Umsatzsteuer berechnet.</p>
          </Show>
        </section>

        <Show when={p.actions?.addNote} fallback={null}>
          <DashOrderNotesSection
            notes={p.order.notes}
            sessionUserName={p.sessionUserName}
            state={p.notesState}
            onAdd={(text) => p.actions?.addNote?.(p.order, text)}
            onDelete={(noteId, author) => p.onDeleteNote(noteId, author)}
          />
        </Show>

        <section aria-label="Verlauf">
          <h2 class="text-sm font-semibold">Verlauf</h2>
          <ol class="mt-2 flex flex-col">
            <For each={timeline()}>
              {(entry, index) => (
                <li class="relative flex gap-3 pb-4 last:pb-0">
                  <Show when={index() < timeline().length - 1}>
                    <span aria-hidden="true" class="absolute left-[5px] top-4 h-full w-px bg-border-subtle" />
                  </Show>
                  <span
                    aria-hidden="true"
                    class="mt-1.5 size-[11px] shrink-0 rounded-full border-2 border-brand bg-surface"
                  />
                  <div class="min-w-0 text-sm">
                    <p class="font-medium">{entry.title}</p>
                    <Show when={entry.detail}>{(detail) => <p class="truncate text-content-muted">{detail()}</p>}</Show>
                    <p class="text-xs text-content-muted">
                      <DashRelativeTime iso={entry.at} />
                    </p>
                  </div>
                </li>
              )}
            </For>
          </ol>
        </section>
      </div>
      {/* Second-layer dialogs: nested inside Sheet content (corvu nested layers). */}
      <Show when={p.dialogs}>{(dialogs) => <>{dialogs()}</>}</Show>
    </Sheet>
  )
}
