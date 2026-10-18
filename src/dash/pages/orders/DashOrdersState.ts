import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashOrdersChannelFilter, DashOrdersStatusFilter } from "./model/dashOrderListFilter.ts"

export type DashOrdersState = {
  q: () => string
  setQ: (value: string) => void
  status: () => DashOrdersStatusFilter
  setStatus: (value: DashOrdersStatusFilter) => void
  kanal: () => DashOrdersChannelFilter
  setKanal: (value: DashOrdersChannelFilter) => void
  eventId: () => string | null
  setEventId: (value: string | null) => void
  visibleCount: () => number
  setVisibleCount: (value: number) => void
}

export function DashOrdersStateCreate(initial: {
  q: string
  status: DashOrdersStatusFilter
  kanal: DashOrdersChannelFilter
  eventId: string | null
}): DashOrdersState {
  const q = createSignalObject(initial.q)
  const status = createSignalObject<DashOrdersStatusFilter>(initial.status)
  const kanal = createSignalObject<DashOrdersChannelFilter>(initial.kanal)
  const eventId = createSignalObject<string | null>(initial.eventId)
  const visibleCount = createSignalObject(50)
  return {
    q: q.get,
    setQ: q.set,
    status: status.get,
    setStatus: status.set,
    kanal: kanal.get,
    setKanal: kanal.set,
    eventId: eventId.get,
    setEventId: eventId.set,
    visibleCount: visibleCount.get,
    setVisibleCount: visibleCount.set,
  }
}
