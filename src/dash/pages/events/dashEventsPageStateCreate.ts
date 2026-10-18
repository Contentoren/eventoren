import { createEffect, createMemo, on } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashOrgEvents } from "../../store/dashOrgEvents.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashEventSalesPause } from "../../store/actions/event/dashEventSalesPause.ts"
import { dashEventPhaseGet } from "../../model/dashEventPhaseGet.ts"
import { dashEventPublicPath } from "../../model/dashEventPublicPath.ts"
import { dashEventStats } from "../../model/dashEventStats.ts"
import type { DashEventCategory } from "../../model/dashEventCategorySchema.ts"
import type { DashEvent } from "../../model/dashEventSchema.ts"
import {
  dashEventListCategories,
  dashEventListCounts,
  dashEventListRows,
  type DashEventListStats,
  type DashEventsTab,
} from "./model/dashEventListFilter.ts"

export type DashEventsAnsicht = "liste" | "kacheln"

export interface DashEventsSearch {
  tab: DashEventsTab
  q: string
  ansicht: DashEventsAnsicht
}

export type DashEventsDialog = "duplizieren" | "vorlage-speichern" | "absagen"

function tabParse(raw: unknown): DashEventsTab {
  if (raw === "aktuell" || raw === "entwuerfe" || raw === "vergangen" || raw === "vorlagen") return raw
  return "aktuell"
}

/** Leniente Search-Parse für die Events-Liste: ungültige Werte fallen auf Defaults zurück. */
export function dashEventsSearchParse(raw: Record<string, unknown>): DashEventsSearch {
  return {
    tab: tabParse(raw["tab"]),
    q: typeof raw["q"] === "string" ? raw["q"] : "",
    ansicht: raw["ansicht"] === "kacheln" ? "kacheln" : "liste",
  }
}

/** Zustand der Events-Liste: Tabs, Suche (entprellt), Kategorie, Ansicht, Kennzahlen und Aktionen. */
export function dashEventsPageStateCreate(inputs: {
  search: () => DashEventsSearch
  onPatch: (patch: Partial<DashEventsSearch>) => void
}) {
  const navigate = useNavigate()
  const now = dashNow()
  const qDraft = createSignalObject(inputs.search().q)
  const category = createSignalObject<DashEventCategory | null>(null)

  createEffect(
    on(
      () => inputs.search().q,
      (q) => qDraft.set(q),
    ),
  )

  let qTimer: ReturnType<typeof setTimeout> | null = null
  const setQ = (value: string) => {
    qDraft.set(value)
    if (qTimer) clearTimeout(qTimer)
    qTimer = setTimeout(() => inputs.onPatch({ q: value }), 250)
  }

  const org = () => dashActiveOrg()
  const canEdit = () => dashCan("events.bearbeiten")
  const canSeeRevenue = () => dashCan("umsatz.sehen")
  const tab = () => inputs.search().tab
  const ansicht = () => inputs.search().ansicht

  const events = () => {
    const current = org()
    if (!current) return []
    return dashOrgEvents(current.id)
  }

  const statsById = createMemo((): Record<string, DashEventListStats> => {
    const state = dashStateGet()
    const current = now()
    const map: Record<string, DashEventListStats> = {}
    for (const event of events()) {
      const stats = dashEventStats({ state, eventId: event.id, now: current })
      map[event.id] = { sold: stats.sold, capacity: stats.capacity, revenueCents: stats.revenueCents }
    }
    return map
  })

  const templates = () => {
    const current = org()
    if (!current) return []
    return dashStateGet()
      .templates.filter((template) => template.orgId === current.id)
      .sort((left, right) => (left.createdAt > right.createdAt ? -1 : 1))
  }

  const counts = () => dashEventListCounts(events(), templates().length, now())

  const categories = () => {
    const current = tab()
    if (current === "vorlagen") return []
    return dashEventListCategories(events(), current, now())
  }

  const rows = () => {
    const current = tab()
    if (current === "vorlagen") return []
    return dashEventListRows({
      events: events(),
      statsById: statsById(),
      tab: current,
      query: inputs.search().q,
      category: category.get(),
      now: now(),
    })
  }

  const hasFilter = () => inputs.search().q.trim() !== "" || category.get() !== null

  const phaseOf = (event: DashEvent) => {
    const stats = statsById()[event.id] ?? { sold: 0, capacity: 0, revenueCents: 0 }
    return dashEventPhaseGet({ event, sold: stats.sold, capacity: stats.capacity, now: now() })
  }

  const publicPathOf = (event: DashEvent): string | null => {
    const current = org()
    if (!current) return null
    return dashEventPublicPath(current.slug, event.slug)
  }

  const selectTab = (next: DashEventsTab) => {
    category.set(null)
    inputs.onPatch({ tab: next })
  }

  const selectCategory = (next: DashEventCategory) => {
    category.set(category.get() === next ? null : next)
  }

  const setAnsicht = (next: DashEventsAnsicht) => inputs.onPatch({ ansicht: next })

  const resetFilters = () => {
    if (qTimer) clearTimeout(qTimer)
    qDraft.set("")
    category.set(null)
    inputs.onPatch({ q: "" })
  }

  const openEvent = (id: string) => {
    void navigate({ to: `/demo/dashboard/events/${id}` as never })
  }

  const openDialog = (id: string, dialog: DashEventsDialog) => {
    void navigate({
      to: "/demo/dashboard/events",
      search: (previous) => ({ ...((previous ?? {}) as Record<string, unknown>), event: id, [dialog]: 1 }),
      replace: true,
    })
  }

  const viewPublic = (event: DashEvent) => {
    const path = publicPathOf(event)
    if (!path) return
    window.open(path, "_blank", "noopener")
  }

  const toggleSales = (event: DashEvent) => {
    const paused = !event.salesPaused
    const result = dashEventSalesPause(event.id, paused)
    if (!result.success) {
      toastAdd({
        title: paused ? "Verkauf konnte nicht pausiert werden" : "Verkauf konnte nicht fortgesetzt werden",
        description: result.errorMessage,
        variant: "error",
      })
      return
    }
    toastAdd({ title: paused ? "Verkauf pausiert" : "Verkauf fortgesetzt", variant: "success" })
  }

  const createNew = () => {
    void navigate({ to: "/demo/dashboard/events/neu" })
  }

  const createFromTemplate = () => {
    category.set(null)
    inputs.onPatch({ tab: "vorlagen" })
  }

  return {
    org,
    canEdit,
    canSeeRevenue,
    tab,
    ansicht,
    qDraft,
    setQ,
    category,
    selectCategory,
    setAnsicht,
    counts,
    categories,
    rows,
    templates,
    hasFilter,
    phaseOf,
    publicPathOf,
    selectTab,
    resetFilters,
    openEvent,
    openDialog,
    viewPublic,
    toggleSales,
    createNew,
    createFromTemplate,
  }
}

export type DashEventsPageState = ReturnType<typeof dashEventsPageStateCreate>
