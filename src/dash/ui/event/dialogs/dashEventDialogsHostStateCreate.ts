import { useNavigate, useSearch } from "@tanstack/solid-router"

import { DashEventCancelDialog } from "./DashEventCancelDialog.tsx"
import { DashEventDuplicateDialog } from "./DashEventDuplicateDialog.tsx"
import { DashEventPublishDialog } from "./DashEventPublishDialog.tsx"
import { DashTemplateSaveDialog } from "./DashTemplateSaveDialog.tsx"

export type DashEventDialogKey = "veroeffentlichen" | "duplizieren" | "vorlage-speichern" | "absagen"

const dashEventDialogKeys: DashEventDialogKey[] = ["veroeffentlichen", "duplizieren", "vorlage-speichern", "absagen"]

/** Liest den aktiven Event-Dialog aus den Search-Params der aktuellen Route. */
export function dashEventDialogsHostStateCreate(inputs?: { eventIdFromSearch?: boolean }) {
  const search = useSearch({ strict: false })
  const navigate = useNavigate()

  const dialogEventId = (fallback = ""): string => {
    if (!inputs?.eventIdFromSearch) return fallback
    const params = (search() ?? {}) as Record<string, unknown>
    return typeof params["event"] === "string" ? (params["event"] as string) : fallback
  }

  const active = (): DashEventDialogKey | null => {
    const params = (search() ?? {}) as Record<string, unknown>
    if (inputs?.eventIdFromSearch) {
      if (typeof params["event"] !== "string" || params["event"] === "") return null
    }
    for (const key of dashEventDialogKeys) {
      if (params[key] === "1" || params[key] === 1) return key
    }
    return null
  }

  const close = (key: DashEventDialogKey) => {
    const params = { ...((search() ?? {}) as Record<string, unknown>) }
    delete params[key]
    if (inputs?.eventIdFromSearch) delete params["event"]
    // Generischer Host: läuft auf allen Event-Routen, deren Search-Schemas sich
    // unterscheiden — daher der Cast (Typen prüfen die Aufrufer-Routen bereits).
    void navigate({ search: params as never, replace: true, resetScroll: false })
  }

  const closeToEvent = (_newEventId: string | null) => {
    const params = { ...((search() ?? {}) as Record<string, unknown>) }
    for (const key of dashEventDialogKeys) delete params[key]
    if (inputs?.eventIdFromSearch) delete params["event"]
    void navigate({ search: params as never, replace: true, resetScroll: false })
  }

  return { active, isOpen: (key: DashEventDialogKey) => active() === key, dialogEventId, close, closeToEvent }
}

export type DashEventDialogsHostState = ReturnType<typeof dashEventDialogsHostStateCreate>
