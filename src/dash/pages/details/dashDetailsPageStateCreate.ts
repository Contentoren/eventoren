import { createEffect } from "solid-js"
import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"

import type { DashEvent } from "../../model/dashEventSchema.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashEventById } from "../../store/dashEventById.ts"
import { dashEventPatch } from "../../store/actions/dashEventPatch.ts"
import {
  dashDetailsDraftFrom,
  dashDetailsErrorCount,
  dashDetailsFirstErrorSection,
  dashDetailsPatchFrom,
  dashDetailsValidate,
  type DashDetailsDraft,
} from "./dashDetailsValidate.ts"

const draftClone = (draft: DashDetailsDraft): DashDetailsDraft => ({
  ...draft,
  schedule: draft.schedule.map((item) => ({ ...item })),
  faq: draft.faq.map((item) => ({ ...item })),
})

const draftEqual = (left: DashDetailsDraft, right: DashDetailsDraft): boolean =>
  JSON.stringify(left) === JSON.stringify(right)

const sectionIndex: Record<string, number> = {
  basis: 0,
  ort: 1,
  bild: 2,
  beschreibung: 3,
  ablauf: 4,
  faq: 5,
  sichtbarkeit: 6,
}

export function dashDetailsPageStateCreate(inputs: { eventId: () => string }) {
  const navigate = useNavigate()
  const draftSignal = createSignalObject<DashDetailsDraft | null>(null)
  const savingSignal = createSignalObject(false)
  const showErrorsSignal = createSignalObject(false)

  const event = () => dashEventById(inputs.eventId())
  const canEdit = () => dashCan("events.bearbeiten")
  const basePath = () => `/demo/dashboard/events/${inputs.eventId()}`
  const syncedSnapshotSignal = createSignalObject<string | null>(null)

  const draft = (): DashDetailsDraft | null => draftSignal.get()

  createEffect(() => {
    const current = event()
    if (!current) {
      draftSignal.set(null)
      syncedSnapshotSignal.set(null)
      return
    }
    const snapshot = JSON.stringify(dashDetailsDraftFrom(current))
    if (syncedSnapshotSignal.get() === null) {
      draftSignal.set(dashDetailsDraftFrom(current))
      syncedSnapshotSignal.set(snapshot)
      return
    }
    if (syncedSnapshotSignal.get() === snapshot) return
    const pending = draftSignal.get()
    if (pending && draftEqual(pending, JSON.parse(syncedSnapshotSignal.get() ?? "null") as DashDetailsDraft)) {
      draftSignal.set(dashDetailsDraftFrom(current))
    }
    syncedSnapshotSignal.set(snapshot)
  })

  const syncFromEvent = (current: DashEvent): void => {
    draftSignal.set(dashDetailsDraftFrom(current))
    syncedSnapshotSignal.set(JSON.stringify(dashDetailsDraftFrom(current)))
    showErrorsSignal.set(false)
  }

  const errors = () => {
    const current = draft()
    if (!current) return null
    return dashDetailsValidate(current)
  }

  const dirty = (): boolean => {
    const current = event()
    const pending = draft()
    if (!current || !pending) return false
    return !draftEqual(pending, dashDetailsDraftFrom(current))
  }

  const setDraft = (patch: Partial<DashDetailsDraft>): void => {
    if (!canEdit()) return
    const current = draftSignal.get()
    if (!current) return
    draftSignal.set({ ...current, ...patch })
  }

  const setVenue = (patch: { name?: string; street?: string; zip?: string; city?: string }): void => {
    if (!canEdit()) return
    const current = draftSignal.get()
    if (!current) return
    draftSignal.set({
      ...current,
      venueName: patch.name ?? current.venueName,
      venueStreet: patch.street ?? current.venueStreet,
      venueZip: patch.zip ?? current.venueZip,
      venueCity: patch.city ?? current.venueCity,
    })
  }

  const discard = (): void => {
    const current = event()
    if (current) syncFromEvent(current)
    savingSignal.set(false)
  }

  const scrollToSection = (section: string): void => {
    if (typeof document === "undefined") return
    const attempt = (tries: number): void => {
      const target = document.getElementById(`details-${section}`)
      if (target) {
        const behavior = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
        target.scrollIntoView({ behavior, block: "start" })
        const focusable = target.querySelector<HTMLElement>("input, textarea, select, [tabindex]")
        focusable?.focus({ preventScroll: true })
        return
      }
      if (tries > 0) setTimeout(() => attempt(tries - 1), 100)
    }
    attempt(5)
  }

  const save = (): void => {
    const pending = draft()
    if (!pending || savingSignal.get() || !canEdit()) return
    const validation = dashDetailsValidate(pending)
    if (dashDetailsErrorCount(validation) > 0) {
      showErrorsSignal.set(true)
      const section = dashDetailsFirstErrorSection(validation)
      if (section) scrollToSection(section)
      return
    }
    savingSignal.set(true)
    const result = dashEventPatch(inputs.eventId(), dashDetailsPatchFrom(pending), {
      action: "Eventdetails geändert",
    })
    savingSignal.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    showErrorsSignal.set(false)
    toastAdd({ title: "Änderungen gespeichert", variant: "success" })
  }

  const setCategory = (category: DashDetailsDraft["category"]): void => {
    if (!canEdit()) return
    setDraft({ category })
  }

  const shiftDoors = (minutes: number): void => {
    const pending = draftSignal.get()
    if (!pending || !pending.startsAt) return
    const shifted = new Date(new Date(pending.startsAt).getTime() - minutes * 60_000).toISOString()
    draftSignal.set({ ...pending, doorsAt: shifted })
  }

  const openCancel = (): void => {
    void navigate({ to: `${basePath()}/details` as never, search: { absagen: 1 } as never })
  }

  const mapsQuery = (): string => {
    const pending = draft()
    const venue = event()?.venue
    const parts = [pending?.venueStreet ?? venue?.street ?? "", pending?.venueCity ?? venue?.city ?? ""]
      .map((part) => part.trim())
      .filter((part) => part !== "")
    return encodeURIComponent(parts.join(", "))
  }

  const navItems = () =>
    Object.keys(sectionIndex).map((id) => ({
      id,
      label:
        id === "basis"
          ? "Basis"
          : id === "ort"
            ? "Ort"
            : id === "bild"
              ? "Bild"
              : id === "beschreibung"
                ? "Beschreibung"
                : id === "ablauf"
                  ? "Ablauf"
                  : id === "faq"
                    ? "FAQ"
                    : "Sichtbarkeit",
      hash: `#details-${id}`,
    }))

  return {
    event,
    canEdit,
    basePath,
    draft,
    draftSignal,
    savingSignal,
    showErrorsSignal,
    errors,
    dirty,
    setDraft,
    setCategory,
    setVenue,
    discard,
    save,
    shiftDoors,
    openCancel,
    mapsQuery,
    navItems,
    scrollToSection,
  }
}

export type DashDetailsPageState = ReturnType<typeof dashDetailsPageStateCreate>
