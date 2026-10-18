import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashTemplate } from "../../../model/dashTemplateSchema.ts"
import { dashEventCategoryLabel } from "../model/dashEventListFilter.ts"

export interface DashEventsTemplatesInputs {
  templates: () => Array<DashTemplate>
}

/** Zustand der Vorlagenkarten: Umbenennen- und Löschen-Auswahl mit Namensfeld. */
export function dashEventsTemplatesStateCreate(inputs: DashEventsTemplatesInputs) {
  const navigate = useNavigate()
  const renameId = createSignalObject<string | null>(null)
  const renameName = createSignalObject("")
  const renameError = createSignalObject<string | null>(null)
  const deleteId = createSignalObject<string | null>(null)

  const templates = () => inputs.templates()

  const categoryLabel = (template: DashTemplate) => dashEventCategoryLabel(template.event.category)

  const startRename = (id: string) => {
    const template = templates().find((entry) => entry.id === id)
    if (!template) return
    renameId.set(id)
    renameName.set(template.name)
    renameError.set(null)
  }

  const closeRename = () => {
    renameId.set(null)
    renameName.set("")
    renameError.set(null)
  }

  const renameTarget = () => {
    const id = renameId.get()
    if (id === null) return null
    return templates().find((entry) => entry.id === id) ?? null
  }

  const startDelete = (id: string) => deleteId.set(id)

  const closeDelete = () => deleteId.set(null)

  const deleteTarget = () => {
    const id = deleteId.get()
    if (id === null) return null
    return templates().find((entry) => entry.id === id) ?? null
  }

  const useTemplate = (id: string) => {
    void navigate({ to: "/demo/dashboard/events/neu", search: { vorlage: id } })
  }

  return {
    templates,
    categoryLabel,
    renameId: renameId.get,
    renameName: renameName.get,
    setRenameName: renameName.set,
    renameError: renameError.get,
    setRenameError: renameError.set,
    renameTarget,
    startRename,
    closeRename,
    deleteId: deleteId.get,
    deleteTarget,
    startDelete,
    closeDelete,
    useTemplate,
  }
}

export type DashEventsTemplatesState = ReturnType<typeof dashEventsTemplatesStateCreate>
