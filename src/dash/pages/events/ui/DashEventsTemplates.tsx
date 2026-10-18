import { mdiDotsHorizontal } from "@adaptive-ds/mdi/mdiDotsHorizontal.js"
import { mdiFileDocumentOutline } from "@adaptive-ds/mdi/mdiFileDocumentOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import Dialog from "@corvu/dialog"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { buttonVariant } from "#ui/interactive/button/buttonCva.js"
import { ConfirmDialog } from "#ui/interactive/dialog/ConfirmDialog.jsx"
import { classesDialogContentMerge, classesDialogOverlayMerge } from "#ui/interactive/dialog/classesDialogContent.js"
import { DropdownMenu } from "#ui/interactive/menu/DropdownMenu.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashTemplateDelete } from "../../../store/actions/event/dashTemplateDelete.ts"
import { dashTemplateRename } from "../../../store/actions/event/dashTemplateRename.ts"
import { DashField } from "../../../ui/layout/DashField.tsx"
import type { DashEventsTemplatesState } from "./dashEventsTemplatesStateCreate.ts"

export interface DashEventsTemplatesProps {
  state: DashEventsTemplatesState
}

/** Vorlagenkarten: Name, Kategorie, Ticketarten, Erstelldatum, Verwenden und Menü. */
export function DashEventsTemplates(p: DashEventsTemplatesProps) {
  return (
    <Show
      when={p.state.templates().length > 0}
      fallback={
        <div class="rounded-card border border-border-subtle bg-surface">
          <EmptyState
            icon={mdiFileDocumentOutline}
            title="Noch keine Vorlagen"
            description="Speichere ein Event als Vorlage über ⋯"
          />
        </div>
      }
    >
      <ul class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {p.state.templates().map((template) => (
          <li class="flex flex-col gap-3 rounded-card border border-border-subtle bg-surface p-4 sm:p-5">
            <div class="flex items-start justify-between gap-2">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold text-content">{template.name}</p>
                <p class="mt-0.5 text-sm text-content-muted">{p.state.categoryLabel(template)}</p>
              </div>
              <DropdownMenu
                items={[
                  {
                    type: "item",
                    id: "umbenennen",
                    label: "Umbenennen",
                    icon: mdiPencilOutline,
                    onSelect: () => p.state.startRename(template.id),
                  },
                  { type: "separator" },
                  {
                    type: "item",
                    id: "loeschen",
                    label: "Löschen",
                    icon: mdiTrashCanOutline,
                    tone: "danger",
                    onSelect: () => p.state.startDelete(template.id),
                  },
                ]}
                triggerIcon={mdiDotsHorizontal}
                triggerAriaLabel={`Aktionen für ${template.name}`}
              />
            </div>
            <p class="text-sm tabular-nums text-content-muted">
              {template.ticketTypes.length} {template.ticketTypes.length === 1 ? "Ticketart" : "Ticketarten"} ·{" "}
              {dashDateFormat(template.createdAt, "datum")}
            </p>
            <div class="mt-auto">
              <Button
                type="button"
                variant={buttonVariant.outline}
                class="h-9 w-full px-3 text-sm"
                onClick={() => p.state.useTemplate(template.id)}
              >
                Verwenden
              </Button>
            </div>
          </li>
        ))}
      </ul>
      <Dialog
        open={p.state.renameId() !== null}
        onOpenChange={(open) => {
          if (!open) p.state.closeRename()
        }}
      >
        <Dialog.Portal>
          <Dialog.Overlay class={classesDialogOverlayMerge()} />
          <Dialog.Content class={classesDialogContentMerge("w-[calc(100vw-2rem)] max-w-[400px]")}>
            <header class="mb-4">
              <Dialog.Label class="text-lg font-semibold">Vorlage umbenennen</Dialog.Label>
              <Dialog.Description class="mt-1 text-sm text-content-muted">
                Gib der Vorlage einen eindeutigen Namen.
              </Dialog.Description>
            </header>
            <DashField label="Neuer Name" for="dash-template-rename" error={p.state.renameError()}>
              <Input
                id="dash-template-rename"
                class="h-10 rounded-control text-sm"
                value={p.state.renameName()}
                onInput={(event) => p.state.setRenameName(event.currentTarget.value)}
                autocomplete="off"
              />
            </DashField>
            <div class="mt-4 flex items-center justify-end gap-2">
              <Button type="button" variant="outline" class="h-9 px-3 text-sm" onClick={() => p.state.closeRename()}>
                Abbrechen
              </Button>
              <Button
                type="button"
                variant={buttonVariant.contrast}
                class="h-9 px-3 text-sm"
                onClick={() => {
                  const target = p.state.renameTarget()
                  if (!target) return
                  const result = dashTemplateRename(target.id, p.state.renameName())
                  if (!result.success) {
                    p.state.setRenameError(result.errorMessage)
                    return
                  }
                  p.state.closeRename()
                  toastAdd({ title: "Vorlage umbenannt", variant: "success" })
                }}
              >
                Speichern
              </Button>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog>
      <ConfirmDialog
        open={p.state.deleteId() !== null}
        onOpenChange={(open) => {
          if (!open) p.state.closeDelete()
        }}
        title="Vorlage löschen?"
        description="Die Vorlage wird endgültig entfernt. Bestehende Events bleiben erhalten."
        confirmLabel="Löschen"
        tone="danger"
        onConfirm={() => {
          const target = p.state.deleteTarget()
          if (!target) return
          const result = dashTemplateDelete(target.id)
          if (!result.success) {
            toastAdd({
              title: "Vorlage konnte nicht gelöscht werden",
              description: result.errorMessage,
              variant: "error",
            })
            return
          }
          p.state.closeDelete()
          toastAdd({ title: `Vorlage „${target.name}“ gelöscht`, variant: "success" })
        }}
      />
    </Show>
  )
}
