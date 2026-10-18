import { createMemo } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { dashActiveOrg } from "../../../store/dashActiveOrg.ts"
import { dashCan } from "../../../store/dashCan.ts"
import { dashNow } from "../../../store/dashNow.ts"
import { dashOrgEvents } from "../../../store/dashOrgEvents.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashFeeCompute } from "../../../model/dashFeeCompute.ts"
import { dashIbanMask } from "../../../model/dashIbanMask.ts"
import { dashSettlementCompute } from "../../../model/dashSettlementCompute.ts"
import { dashFinancePayoutRows } from "../model/dashFinancePayoutRows.ts"

/** Zustand der Org-Finanzseite: KPIs, Auszahlungszeilen, Gebührenmodell und Bankinfo. */
export function dashFinancePageStateCreate() {
  const navigate = useNavigate()
  const now = dashNow()
  const org = () => dashActiveOrg()
  const canSee = () => dashCan("finanzen.sehen")
  const canEditBank = () => dashCan("bank.bearbeiten")

  const events = createMemo(() => {
    const active = org()
    if (!active) return []
    return dashOrgEvents(active.id).filter((event) => event.status === "veroeffentlicht")
  })

  const settlementByEvent = createMemo(() => {
    const state = dashStateGet()
    const active = org()
    const map = new Map<string, ReturnType<typeof dashSettlementCompute>>()
    if (!active) return map
    for (const event of events()) {
      map.set(
        event.id,
        dashSettlementCompute({
          event,
          ticketTypes: state.ticketTypes,
          orders: state.orders,
          tickets: state.tickets,
          org: active,
        }),
      )
    }
    return map
  })

  const hasSales = (eventId: string) => {
    const settlement = settlementByEvent().get(eventId)
    return settlement !== undefined && settlement.includedOrders > 0
  }

  const rows = createMemo(() =>
    dashFinancePayoutRows({
      events: events(),
      payouts: dashStateGet().payouts,
      settlementPayout: (eventId) => settlementByEvent().get(eventId)?.payoutCents ?? 0,
      hasSales,
    }),
  )

  const berlinYear = (iso: string) =>
    new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", year: "numeric" }).format(new Date(iso))

  const paidThisYear = createMemo(() => {
    const year = berlinYear(now().toISOString())
    return rows()
      .filter((row) => !row.projected && row.status === "ausgezahlt")
      .filter((row) => {
        const payout = dashStateGet().payouts.find((candidate) => candidate.eventId === row.eventId)
        if (!payout?.paidAt) return false
        return berlinYear(payout.paidAt) === year
      })
      .reduce((sum, row) => sum + row.amountCents, 0)
  })

  const nextPayout = createMemo(() => {
    const upcoming = rows()
      .filter((row) => row.status !== "ausgezahlt")
      .sort((left, right) => (left.dueAt < right.dueAt ? -1 : left.dueAt > right.dueAt ? 1 : 0))
    return upcoming[0] ?? null
  })

  const openTotal = createMemo(() => {
    const current = now()
    return rows()
      .filter((row) => {
        const event = events().find((candidate) => candidate.id === row.eventId)
        return event !== undefined && new Date(event.endsAt) >= current && row.status === "geplant"
      })
      .reduce((sum, row) => sum + row.amountCents, 0)
  })

  const feeExample = createMemo(() => {
    const active = org()
    if (!active) return null
    return dashFeeCompute({ priceCents: 2500, fee: active.fee })
  })

  const openEvent = (eventId: string) => {
    void navigate({ to: `/demo/dashboard/events/${eventId}/abrechnung` as never })
  }

  const openSettings = () => {
    void navigate({ to: "/demo/dashboard/einstellungen" as never })
  }

  return {
    org,
    now,
    canSee,
    canEditBank,
    events,
    rows,
    paidThisYear,
    nextPayout,
    openTotal,
    feeExample,
    openEvent,
    openSettings,
    cents: (cents: number) => dashCentsFormat(cents),
    date: (iso: string) => dashDateFormat(iso, "datum"),
    maskedIban: () => (org() ? dashIbanMask(org()?.bank.iban ?? "") : "–"),
  }
}

export type DashFinancePageState = ReturnType<typeof dashFinancePageStateCreate>
