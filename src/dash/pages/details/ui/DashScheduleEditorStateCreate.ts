import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashScheduleItem } from "../../../model/dashScheduleItemSchema.ts"
import { dashListItemIdCreate } from "../model/dashListItemIdCreate.ts"
import { dashListItemMove } from "../model/dashListItemMove.ts"
import { dashScheduleFromEvent } from "../model/dashScheduleFromEvent.ts"
import { dashScheduleSort } from "../model/dashScheduleSort.ts"

/** Lokaler UI-Zustand des Programmeditors: Drag-Sortierung, Hinzufügen, Bearbeiten, Löschen. */
export function DashScheduleEditorStateCreate(inputs: {
  items: () => DashScheduleItem[]
  onChange: (items: DashScheduleItem[]) => void
  event: () => { doorsAt: string | null; startsAt: string; endsAt: string }
}) {
  const dragId = createSignalObject<string | null>(null)

  const outOfOrder = () => {
    const current = inputs.items()
    return current.some((item, index) => index > 0 && (current[index - 1]?.time ?? "") > item.time)
  }

  const isDragging = (id: string) => dragId.get() === id

  const addItem = () => {
    const current = inputs.items()
    inputs.onChange([
      ...current,
      { id: dashListItemIdCreate(), time: current[current.length - 1]?.time ?? "18:00", title: "", detail: "" },
    ])
  }

  const updateItem = (id: string, patch: { time?: string; title?: string; detail?: string }) => {
    inputs.onChange(inputs.items().map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    inputs.onChange(inputs.items().filter((item) => item.id !== id))
  }

  const buildFromEvent = () => {
    inputs.onChange(dashScheduleFromEvent(inputs.event()))
  }

  const sortByTime = () => {
    inputs.onChange(dashScheduleSort(inputs.items()))
  }

  const startDrag = (id: string, domEvent: DragEvent) => {
    dragId.set(id)
    domEvent.dataTransfer?.setData("text/plain", id)
  }

  const allowDrop = (domEvent: DragEvent) => {
    if (dragId.get() !== null) domEvent.preventDefault()
  }

  const dropOn = (targetId: string, domEvent: DragEvent) => {
    domEvent.preventDefault()
    const dragged = dragId.get()
    dragId.set(null)
    if (dragged === null || dragged === targetId) return
    inputs.onChange(dashListItemMove(inputs.items(), dragged, targetId))
  }

  const endDrag = () => {
    dragId.set(null)
  }

  return {
    outOfOrder,
    isDragging,
    addItem,
    updateItem,
    removeItem,
    buildFromEvent,
    sortByTime,
    startDrag,
    allowDrop,
    dropOn,
    endDrag,
  }
}

export type DashScheduleEditorState = ReturnType<typeof DashScheduleEditorStateCreate>
