import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashNow } from "../../store/dashNow.ts"
import type { DashPayout } from "../../model/dashPayoutSchema.ts"

export type DashAdminPayoutStatusFilter = "bereit" | "geplant" | "ausgezahlt" | "alle"

export type DashAdminPayoutRow = {
  payout: DashPayout
  orgName: string
  orgLogo: string | null
  orgIban: string
  eventTitle: string
  eventEndsAt: string
}

export type DashAdminPayoutsSearch = {
  status: DashAdminPayoutStatusFilter
  auszahlung: string
}

/** Leniente Search-Validierung für die Admin-Auszahlungsliste. */
export function dashAdminPayoutsSearchParse(raw: Record<string, unknown>): DashAdminPayoutsSearch {
  const statusRaw = typeof raw["status"] === "string" ? raw["status"] : "bereit"
  const status: DashAdminPayoutStatusFilter =
    statusRaw === "bereit" || statusRaw === "geplant" || statusRaw === "ausgezahlt" || statusRaw === "alle"
      ? statusRaw
      : "bereit"
  const auszahlung = typeof raw["auszahlung"] === "string" ? raw["auszahlung"] : ""
  return { status, auszahlung }
}

export function dashAdminPayoutsStateCreate(inputs: { search: () => DashAdminPayoutsSearch }) {
  const now = dashNow()
  const selectedKeys = createSignalObject<string[]>([])
  const confirmOpen = createSignalObject(false)

  const rows = createMemo((): DashAdminPayoutRow[] => {
    const state = dashStateGet()
    const orgById = new Map(state.orgs.map((org) => [org.id, org]))
    const eventById = new Map(state.events.map((event) => [event.id, event]))
    return state.payouts
      .map((payout): DashAdminPayoutRow | null => {
        const org = orgById.get(payout.orgId)
        const event = eventById.get(payout.eventId)
        if (!org || !event) return null
        return {
          payout,
          orgName: org.name,
          orgLogo: org.logoDataUrl,
          orgIban: org.bank.iban,
          eventTitle: event.title,
          eventEndsAt: event.endsAt,
        }
      })
      .filter((row): row is DashAdminPayoutRow => row !== null)
      .sort((left, right) => Date.parse(right.eventEndsAt) - Date.parse(left.eventEndsAt))
  })

  const counts = createMemo((): Record<DashAdminPayoutStatusFilter, number> => {
    const all = rows()
    return {
      bereit: all.filter((row) => row.payout.status === "bereit").length,
      geplant: all.filter((row) => row.payout.status === "geplant").length,
      ausgezahlt: all.filter((row) => row.payout.status === "ausgezahlt").length,
      alle: all.length,
    }
  })

  const filtered = createMemo((): DashAdminPayoutRow[] => {
    const status = inputs.search().status
    return rows().filter((row) => (status === "alle" ? true : row.payout.status === status))
  })

  const selectedReady = createMemo((): DashAdminPayoutRow[] =>
    filtered().filter((row) => row.payout.status === "bereit" && selectedKeys.get().includes(row.payout.id)),
  )

  const selectedSum = createMemo((): number => selectedReady().reduce((sum, row) => sum + row.payout.amountCents, 0))

  const paidLast30Days = createMemo((): number => {
    const current = now()
    const threshold = current.getTime() - 30 * 86_400_000
    return rows()
      .filter((row) => row.payout.status === "ausgezahlt" && row.payout.paidAt !== null)
      .filter((row) => Date.parse(row.payout.paidAt as string) >= threshold)
      .reduce((sum, row) => sum + row.payout.amountCents, 0)
  })

  const kpiReady = createMemo((): { sum: number; count: number } => {
    const ready = rows().filter((row) => row.payout.status === "bereit")
    return { sum: ready.reduce((sum, row) => sum + row.payout.amountCents, 0), count: ready.length }
  })

  const kpiPlanned = createMemo((): number =>
    rows()
      .filter((row) => row.payout.status === "geplant")
      .reduce((sum, row) => sum + row.payout.amountCents, 0),
  )

  const activePayout = createMemo((): DashAdminPayoutRow | null => {
    const id = inputs.search().auszahlung
    if (id === "") return null
    return rows().find((row) => row.payout.id === id) ?? null
  })

  const selectedLabel = createMemo((): string => {
    const count = selectedReady().length
    const sum = dashCentsFormat(selectedSum())
    return `${count} ${count === 1 ? "Auszahlung" : "Auszahlungen"} · ${sum} als ausgezahlt markieren?`
  })

  return {
    rows,
    counts,
    filtered,
    selectedKeys,
    confirmOpen,
    selectedReady,
    selectedSum,
    selectedLabel,
    paidLast30Days,
    kpiReady,
    kpiPlanned,
    activePayout,
  }
}

export type DashAdminPayoutsState = ReturnType<typeof dashAdminPayoutsStateCreate>
