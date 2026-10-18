import { createMemo } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import type { DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { copyFallback } from "#ui/interactive/copy/copyFallback.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashNow } from "../../store/dashNow.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashEventPhaseGet } from "../../model/dashEventPhaseGet.ts"
import { dashEventPublicPath } from "../../model/dashEventPublicPath.ts"
import { dashEventPublicUrl } from "../../model/dashEventPublicUrl.ts"
import { dashEventPatch } from "../../store/actions/dashEventPatch.ts"

const dialogParam = (base: string, param: string) => `${base}?${param}=1`

async function dashEventLinkCopy(url: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(url)
  } catch {
    copyFallback(url)
  }
  toastAdd({ title: "Link kopiert", variant: "success" })
}

export function dashEventHeaderStateCreate(inputs: { eventId: () => string }) {
  const navigate = useNavigate()
  const event = () => dashEventById(inputs.eventId())
  const org = () => dashActiveOrg()
  const canEdit = () => dashCan("events.bearbeiten")
  const eventCounts = createMemo(() => {
    const current = event()
    if (!current) return { sold: 0, capacity: 0 }
    const state = dashStateGet()
    const sold = state.tickets.filter((ticket) => ticket.eventId === current.id && ticket.status === "gueltig").length
    const capacity = state.ticketTypes
      .filter((type) => type.eventId === current.id)
      .reduce((sum, type) => sum + type.capacity, 0)
    return { sold, capacity }
  })
  const phase = () => {
    const current = event()
    if (!current) return null
    const { sold, capacity } = eventCounts()
    return dashEventPhaseGet({ event: current, sold, capacity, now: dashNow()() })
  }
  const dateLine = () => {
    const current = event()
    return current ? dashDateFormat(current.startsAt, "kurz") : ""
  }
  const venueLine = () => {
    const current = event()
    if (!current) return ""
    const city = current.venue.city.trim()
    return city === "" ? current.venue.name : `${current.venue.name} · ${city}`
  }
  const publicPath = () => {
    const current = event()
    const active = org()
    if (!current || !active) return null
    return dashEventPublicPath(active.slug, current.slug)
  }
  const publicUrl = () => {
    const current = event()
    const active = org()
    if (!current || !active) return null
    return dashEventPublicUrl(active.slug, current.slug)
  }
  const primaryAction = (): { kind: "publish" | "entry" | "share"; label: string; to?: string } | null => {
    const current = event()
    if (!current || !canEdit()) return null
    if (current.status === "entwurf") return { kind: "publish", label: "Veröffentlichen" }
    const currentPhase = phase()
    if (currentPhase === "live")
      return { kind: "entry", label: "Live-Einlass", to: `/demo/dashboard/events/${current.id}/einlass` }
    return { kind: "share", label: "Teilen" }
  }
  const primarySelect = () => {
    const action = primaryAction()
    const current = event()
    if (!action || !current) return
    if (action.kind === "publish") {
      void navigate({
        to: `/demo/dashboard/events/${current.id}` as never,
        search: { veroeffentlichen: 1 } as never,
      })
      return
    }
    if (action.kind === "entry" && action.to) {
      void navigate({ to: action.to as never })
      return
    }
    const url = publicUrl()
    if (url) void dashEventLinkCopy(url)
  }
  const pauseLabel = () => ((event()?.salesPaused ?? false) ? "Verkauf fortsetzen" : "Verkauf pausieren")
  const toggleSales = () => {
    const current = event()
    if (!current) return
    const paused = current.salesPaused
    const result = paused
      ? dashEventPatch(current.id, { salesPaused: false }, { action: "Verkauf fortgesetzt" })
      : dashEventPatch(current.id, { salesPaused: true }, { action: "Verkauf pausiert" })
    if (!result.success) {
      toastAdd({ title: "Verkauf konnte nicht umgeschaltet werden", variant: "error" })
      return
    }
    toastAdd({ title: paused ? "Verkauf fortgesetzt" : "Verkauf pausiert", variant: "success" })
  }
  const menuItems = (): DropdownMenuEntry[] => {
    const current = event()
    if (!current || !canEdit()) return []
    const base = `/demo/dashboard/events/${current.id}`
    return [
      {
        type: "item",
        id: "duplizieren",
        label: "Duplizieren",
        onSelect: () => void navigate({ to: base as never, search: { duplizieren: 1 } as never }),
      },
      {
        type: "item",
        id: "vorlage-speichern",
        label: "Als Vorlage speichern",
        onSelect: () => void navigate({ to: base as never, search: { "vorlage-speichern": 1 } as never }),
      },
      {
        type: "item",
        id: "verkauf-umschalten",
        label: pauseLabel(),
        onSelect: toggleSales,
      },
      { type: "separator" },
      {
        type: "item",
        id: "absagen",
        label: "Absagen",
        tone: "danger",
        onSelect: () => void navigate({ to: base as never, search: { absagen: 1 } as never }),
      },
    ]
  }
  return {
    event,
    org,
    canEdit,
    phase,
    dateLine,
    venueLine,
    publicPath,
    publicUrl,
    primaryAction,
    primarySelect,
    menuItems,
    copyLink: () => {
      const url = publicUrl()
      if (url) void dashEventLinkCopy(url)
    },
    dashboardPath: () => `/demo/dashboard/events/${inputs.eventId()}`,
    dialogPath: dialogParam,
  }
}

export type DashEventHeaderState = ReturnType<typeof dashEventHeaderStateCreate>
