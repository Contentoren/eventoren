import { createSignalObject } from "#ui/utils/createSignalObject.js"

import type { DashFaqItem } from "../../../model/dashFaqItemSchema.ts"
import { dashListItemIdCreate } from "../model/dashListItemIdCreate.ts"
import { dashListItemMove } from "../model/dashListItemMove.ts"
import { dashFaqSuggestions, type DashFaqSuggestion } from "../model/dashFaqSuggestions.ts"

/** Lokaler UI-Zustand des FAQ-Editors: Drag-Sortierung, aufgeklappte Frage, Vorschläge. */
export function DashFaqEditorStateCreate(inputs: {
  items: () => DashFaqItem[]
  onChange: (items: DashFaqItem[]) => void
}) {
  const dragId = createSignalObject<string | null>(null)
  const expandedId = createSignalObject<string | null>(null)

  const isExpanded = (id: string) => expandedId.get() === id

  const isDragging = (id: string) => dragId.get() === id

  const visibleSuggestions = () =>
    dashFaqSuggestions().filter((suggestion) => !inputs.items().some((item) => item.question === suggestion.question))

  const toggle = (id: string) => {
    expandedId.set(expandedId.get() === id ? null : id)
  }

  const addItem = () => {
    const id = dashListItemIdCreate()
    inputs.onChange([...inputs.items(), { id, question: "", answer: "" }])
    expandedId.set(id)
  }

  const addSuggestion = (suggestion: DashFaqSuggestion) => {
    const id = dashListItemIdCreate()
    inputs.onChange([...inputs.items(), { id, question: suggestion.question, answer: suggestion.answer }])
    expandedId.set(id)
  }

  const updateItem = (id: string, patch: { question?: string; answer?: string }) => {
    inputs.onChange(inputs.items().map((item) => (item.id === id ? { ...item, ...patch } : item)))
  }

  const removeItem = (id: string) => {
    if (expandedId.get() === id) expandedId.set(null)
    inputs.onChange(inputs.items().filter((item) => item.id !== id))
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
    isExpanded,
    isDragging,
    visibleSuggestions,
    toggle,
    addItem,
    addSuggestion,
    updateItem,
    removeItem,
    startDrag,
    allowDrop,
    dropOn,
    endDrag,
  }
}

export type DashFaqEditorState = ReturnType<typeof DashFaqEditorStateCreate>
