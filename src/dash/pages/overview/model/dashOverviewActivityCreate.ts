import type { DashAuditEntry } from "../../../model/dashAuditEntrySchema.ts"
import { dashCentsFormat } from "../../../model/dashCentsFormat.ts"
import type { DashOrder } from "../../../model/dashOrderSchema.ts"
import type { DashScan } from "../../../model/dashScanSchema.ts"
import type { DashState } from "../../../model/dashStateSchema.ts"

export type DashOverviewActivityKind = "bestellung" | "erstattung" | "aktion" | "checkin"

export type DashOverviewActivityItem = {
  id: string
  kind: DashOverviewActivityKind
  at: string
  title: string
  detail: string
}

type ActivityCandidate = {
  item: DashOverviewActivityItem
  atMs: number
}

const maxItems = 8

function orderTicketCount(order: DashOrder): number {
  return order.lines.reduce((sum, line) => sum + line.quantity, 0)
}

function orderLabel(order: DashOrder): string {
  const first = order.lines[0]
  const name = first?.name ?? "Ticket"
  const count = orderTicketCount(order)
  return `${count} × ${name}`
}

function orderCandidates(state: DashState, orgId: string, nowMs: number): ActivityCandidate[] {
  const eventIds = new Set(state.events.filter((event) => event.orgId === orgId).map((event) => event.id))
  return state.orders
    .filter((order) => order.orgId === orgId && eventIds.has(order.eventId))
    .flatMap((order): ActivityCandidate[] => {
      const items: ActivityCandidate[] = []
      const createdMs = new Date(order.createdAt).getTime()
      if (Number.isFinite(createdMs) && createdMs <= nowMs) {
        items.push({
          item: {
            id: `bestellung-${order.id}`,
            kind: "bestellung",
            at: order.createdAt,
            title: "Neue Bestellung",
            detail: `${order.number} · ${orderLabel(order)} · ${dashCentsFormat(order.totalCents)}`,
          },
          atMs: createdMs,
        })
      }
      for (const refund of order.refunds) {
        const refundMs = new Date(refund.at).getTime()
        if (!Number.isFinite(refundMs) || refundMs > nowMs) continue
        items.push({
          item: {
            id: `erstattung-${refund.id}`,
            kind: "erstattung",
            at: refund.at,
            title: "Erstattung",
            detail: `${order.number} · −${dashCentsFormat(refund.amountCents)}`,
          },
          atMs: refundMs,
        })
      }
      return items
    })
}

function auditCandidates(state: DashState, orgId: string, nowMs: number): ActivityCandidate[] {
  return state.audit
    .filter((entry): entry is DashAuditEntry => entry.orgId === orgId)
    .flatMap((entry) => {
      const atMs = new Date(entry.at).getTime()
      if (!Number.isFinite(atMs) || atMs > nowMs) return []
      return [
        {
          item: {
            id: `aktion-${entry.id}`,
            kind: "aktion" as const,
            at: entry.at,
            title: entry.action,
            detail: entry.actor,
          },
          atMs,
        },
      ]
    })
}

function checkinCandidates(state: DashState, orgId: string, now: Date): ActivityCandidate[] {
  const oneHourAgo = now.getTime() - 3_600_000
  const eventById = new Map(state.events.filter((event) => event.orgId === orgId).map((event) => [event.id, event]))
  const byEvent = new Map<string, DashScan[]>()
  for (const scan of state.scans) {
    const event = eventById.get(scan.eventId)
    if (event === undefined) continue
    if (scan.result !== "ok") continue
    const atMs = new Date(scan.at).getTime()
    if (!Number.isFinite(atMs)) continue
    if (atMs < oneHourAgo || atMs > now.getTime()) continue
    const list = byEvent.get(scan.eventId) ?? []
    list.push(scan)
    byEvent.set(scan.eventId, list)
  }
  return [...byEvent.entries()].map(([eventId, scans]) => {
    const event = eventById.get(eventId)
    const latest = scans.reduce((max, scan) => Math.max(max, new Date(scan.at).getTime()), 0)
    return {
      item: {
        id: `checkin-${eventId}`,
        kind: "checkin" as const,
        at: new Date(latest).toISOString(),
        title: "Check-ins",
        detail: `${scans.length} Einlass · ${event?.title ?? ""}`.trim(),
      },
      atMs: latest,
    }
  })
}

export function dashOverviewActivityCreate(args: {
  state: DashState
  orgId: string
  now: Date
}): DashOverviewActivityItem[] {
  const { state, orgId, now } = args
  const nowMs = now.getTime()
  const candidates = [
    ...orderCandidates(state, orgId, nowMs),
    ...auditCandidates(state, orgId, nowMs),
    ...checkinCandidates(state, orgId, now),
  ]
  candidates.sort((a, b) => b.atMs - a.atMs)
  return candidates
    .filter((candidate) => candidate.atMs <= nowMs)
    .slice(0, maxItems)
    .map((candidate) => candidate.item)
}
