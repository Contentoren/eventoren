import { createEffect, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashPhaseResolve } from "../../model/dashPhaseResolve.ts"
import { dashTicketTypeSales } from "../../model/dashTicketTypeSales.ts"
import type { DashTicketType } from "../../model/dashTicketTypeSchema.ts"
import { dashBoxOfficeSaleCancel } from "../../store/actions/kasse/dashBoxOfficeSaleCancel.ts"
import { dashBoxOfficeSaleCreate } from "../../store/actions/kasse/dashBoxOfficeSaleCreate.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"

export type DashKasseTile = {
  type: DashTicketType
  unitPriceCents: number
  available: number | null
  soldOut: boolean
}

export type DashKassePhase = "wahl" | "zahlung" | "fertig"

/** Zustand Kassenmodus: Auswahl, Vorgang, Bezahlansicht und Erfolgsbildschirm. */
export function dashKasseStateCreate(inputs: {
  eventId: () => string
  saleId?: () => string | null
  onSaleIdChange?: (saleId: string | null) => void
}) {
  const now = dashNow()
  const quantities = createSignalObject<Record<string, number>>({})
  const saleId = createSignalObject<string | null>(null)
  const error = createSignalObject<string | null>(null)
  const success = createSignalObject(false)
  // ?vorgang aus der URL beim ersten Laden (einmalig gelesen, danach steuert der State).
  const pendingSaleId = inputs.saleId?.() ?? null

  const event = () => dashStateGet().events.find((candidate) => candidate.id === inputs.eventId()) ?? null
  const org = () => {
    const current = event()
    if (!current) return null
    return dashStateGet().orgs.find((candidate) => candidate.id === current.orgId) ?? null
  }

  const boxOfficeOn = () => event()?.boxOffice.enabled === true

  const tiles = (): DashKasseTile[] => {
    const state = dashStateGet()
    const eventId = inputs.eventId()
    return state.ticketTypes
      .filter((type) => type.eventId === eventId && type.channel === "abendkasse" && type.archivedAt === null)
      .toSorted((left, right) => left.sortOrder - right.sortOrder)
      .map((type) => {
        const sales = dashTicketTypeSales({ ticketType: type, orders: state.orders, tickets: state.tickets })
        const phase = dashPhaseResolve(type, sales.soldByPhase, now())
        const available = phase.phase ? Math.min(sales.available, phase.remainingInPhase ?? sales.available) : 0
        return {
          type,
          unitPriceCents: phase.phase?.priceCents ?? type.phases[0]?.priceCents ?? 0,
          available: phase.phase ? available : 0,
          soldOut: !phase.phase,
        }
      })
  }

  const tileQuantity = (ticketTypeId: string) => quantities.get()[ticketTypeId] ?? 0

  const increase = (ticketTypeId: string) => {
    const tile = tiles().find((candidate) => candidate.type.id === ticketTypeId)
    if (!tile || tile.soldOut) return
    const max = Math.min(tile.available ?? 0, tile.type.maxPerOrder)
    const next = Math.min(tileQuantity(ticketTypeId) + 1, Math.max(max, 0))
    if (next <= 0) return
    quantities.set({ ...quantities.get(), [ticketTypeId]: next })
    error.set(null)
  }

  const decrease = (ticketTypeId: string) => {
    const next = tileQuantity(ticketTypeId) - 1
    const rest = { ...quantities.get() }
    if (next <= 0) delete rest[ticketTypeId]
    else rest[ticketTypeId] = next
    quantities.set(rest)
  }

  const addOne = (ticketTypeId: string) => increase(ticketTypeId)

  const setSaleId = (id: string | null) => {
    if (saleId.get() === id) return
    saleId.set(id)
    inputs.onSaleIdChange?.(id)
  }

  // Erfolgs-Reset: Der 4-s-Timer läuft erst, wenn der Tab sichtbar ist – sonst wartet
  // die Kasse auf `visibilitychange` → sichtbar. Tippen setzt sofort zurück.
  let successTimer: number | null = null
  let successVisibleHandler: (() => void) | null = null

  const clearSuccessTimer = () => {
    if (typeof window !== "undefined" && successTimer !== null) window.clearTimeout(successTimer)
    successTimer = null
    if (typeof document !== "undefined" && successVisibleHandler) {
      document.removeEventListener("visibilitychange", successVisibleHandler)
      successVisibleHandler = null
    }
  }

  const resetSelection = () => {
    clearSuccessTimer()
    quantities.set({})
    setSaleId(null)
    error.set(null)
    success.set(false)
  }

  const scheduleSuccessReset = () => {
    if (typeof window === "undefined" || typeof document === "undefined") return
    clearSuccessTimer()
    const start = () => {
      clearSuccessTimer()
      successTimer = window.setTimeout(() => resetSelection(), 4000)
    }
    if (document.visibilityState === "visible") {
      start()
    } else {
      successVisibleHandler = () => {
        if (document.visibilityState === "visible") start()
      }
      document.addEventListener("visibilitychange", successVisibleHandler)
    }
  }

  const markPaid = () => {
    if (success.get()) return
    success.set(true)
    scheduleSuccessReset()
  }

  const lines = () =>
    Object.entries(quantities.get())
      .map(([ticketTypeId, quantity]) => ({ ticketTypeId, quantity }))
      .filter((line) => line.quantity > 0)

  const totalCents = () => {
    const byId = new Map(tiles().map((tile) => [tile.type.id, tile.unitPriceCents]))
    return lines().reduce((sum, line) => sum + (byId.get(line.ticketTypeId) ?? 0) * line.quantity, 0)
  }

  const ticketCount = () => lines().reduce((sum, line) => sum + line.quantity, 0)

  const phase = (): DashKassePhase => {
    if (success.get()) return "fertig"
    if (saleId.get()) return "zahlung"
    return "wahl"
  }

  const sale = () => {
    const id = saleId.get()
    if (!id) return null
    return dashStateGet().boxOfficeSales.find((candidate) => candidate.id === id) ?? null
  }

  const saleUrl = () => {
    const id = saleId.get()
    if (!id || typeof window === "undefined") return ""
    return `${window.location.origin}/demo/abendkasse/${inputs.eventId()}?vorgang=${id}`
  }

  const guestUrl = () => {
    if (typeof window === "undefined") return ""
    return `${window.location.origin}/demo/abendkasse/${inputs.eventId()}`
  }

  const timeLabel = () => dashDateFormat(now().toISOString(), "zeit")

  const todayStats = () => {
    const state = dashStateGet()
    const eventId = inputs.eventId()
    const today = dashDateFormat(now().toISOString(), "datum")
    const todays = state.orders.filter(
      (order) =>
        order.eventId === eventId &&
        order.channel === "abendkasse" &&
        dashDateFormat(order.createdAt, "datum") === today,
    )
    const count = todays.reduce((sum, order) => sum + order.lines.reduce((part, line) => part + line.quantity, 0), 0)
    const revenue = todays.reduce((sum, order) => sum + order.totalCents, 0)
    const open = state.boxOfficeSales.filter(
      (candidate) => candidate.eventId === eventId && candidate.status === "wartet",
    ).length
    return { count, revenue: dashCentsFormat(revenue), open }
  }

  const createSale = () => {
    const selected = lines()
    if (selected.length === 0) {
      error.set("Wähle zuerst mindestens ein Ticket.")
      return
    }
    const result = dashBoxOfficeSaleCreate({ eventId: inputs.eventId(), lines: selected })
    if (!result.success) {
      error.set(result.errorMessage)
      return
    }
    error.set(null)
    setSaleId(result.data.id)
  }

  const cancelSale = () => {
    const id = saleId.get()
    if (id) dashBoxOfficeSaleCancel(id)
    resetSelection()
  }

  const dismissError = () => error.set(null)

  // Cross-Tab-Sync: Wenn der Gast zahlt, zeigt die Kasse den Erfolg und setzt zurück.
  // `sale()` liest reaktiv aus dem Store; ein Storage-Event der Gast-Seite
  // aktualisiert den Store (reconcile), sodass dieser Effekt live feuert.
  createEffect(() => {
    const id = saleId.get()
    if (!id || success.get()) return
    const current = dashStateGet().boxOfficeSales.find((candidate) => candidate.id === id)
    if (current?.status === "bezahlt") {
      markPaid()
    } else if (current?.status === "abgebrochen") {
      resetSelection()
    } else if (!current) {
      // Vorgang unbekannt (z. B. nach Reset in anderem Tab): zurück zur Auswahl.
      resetSelection()
    }
  })

  // Nur zur Vorsicht: falls ein Tab kein Storage-Event erhält, greift weiterhin der 1-s-Poll.
  // Beim ersten Laden wird ?vorgang ausgewertet: wartet → QR direkt, bezahlt →
  // Erfolg einmal zeigen, sonst (abgebrochen/unbekannt) → Param entfernen.
  onMount(() => {
    if (typeof window === "undefined") return
    onCleanup(() => clearSuccessTimer())
    if (pendingSaleId) {
      const restored = dashStateGet().boxOfficeSales.find(
        (candidate) => candidate.id === pendingSaleId && candidate.eventId === inputs.eventId(),
      )
      if (!restored || restored.status === "abgebrochen") {
        inputs.onSaleIdChange?.(null)
      } else if (restored.status === "bezahlt") {
        saleId.set(pendingSaleId)
        markPaid()
      } else {
        saleId.set(pendingSaleId)
      }
    }
    const interval = window.setInterval(() => {
      const id = saleId.get()
      if (!id || success.get()) return
      const current = dashStateGet().boxOfficeSales.find((candidate) => candidate.id === id)
      if (current?.status === "bezahlt") markPaid()
      else if (!current || current.status === "abgebrochen") resetSelection()
    }, 1000)
    onCleanup(() => window.clearInterval(interval))
  })

  return {
    event,
    org,
    boxOfficeOn,
    tiles,
    tileQuantity,
    increase,
    decrease,
    addOne,
    lines,
    totalCents,
    ticketCount,
    phase,
    sale,
    saleUrl,
    guestUrl,
    timeLabel,
    todayStats,
    error,
    createSale,
    cancelSale,
    dismissError,
    resetSelection,
    advanceFromSuccess: resetSelection,
  }
}

export type DashKasseState = ReturnType<typeof dashKasseStateCreate>
