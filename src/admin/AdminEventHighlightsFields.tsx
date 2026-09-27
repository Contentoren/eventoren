import { Index } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Label } from "#ui/input/label/Label.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import { adminEventHighlightsFieldsStateCreate } from "./adminEventHighlightsFieldsStateCreate.ts"

export function AdminEventHighlightsFields(props: { state: AdminCatalogPageState }) {
  const state = adminEventHighlightsFieldsStateCreate({ catalog: props.state })

  return (
    <div class="sm:col-span-2">
      <div class="mt-3 flex flex-col gap-4">
        <Index each={state.highlights()}>
          {(highlight, index) => (
            <div class="rounded-lg border border-border p-4 [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/60 dark:[.admin-workspace_&]:bg-slate-800/60">
              <div class="flex items-center justify-between gap-3">
                <span class="text-sm font-medium text-content">Highlight {index + 1}</span>
                <Button
                  type="button"
                  variant="outline"
                  class="[.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface dark:[.admin-workspace_&]:bg-slate-700"
                  onClick={() => state.remove(index)}
                >
                  Entfernen
                </Button>
              </div>
              <Label for={`admin-event-highlight-title-${index}`}>Titel</Label>
              <Input
                id={`admin-event-highlight-title-${index}`}
                class="mt-2 [.admin-workspace_&]:border-0"
                value={highlight().title}
                required
                onInput={(event) => state.change(index, "title", event.currentTarget.value)}
              />
              <Label for={`admin-event-highlight-description-${index}`} class="mt-4 block">
                Beschreibung
              </Label>
              <Textarea
                id={`admin-event-highlight-description-${index}`}
                class="mt-2 [.admin-workspace_&]:border-0"
                value={highlight().description}
                onInput={(event) => state.change(index, "description", event.currentTarget.value)}
              />
            </div>
          )}
        </Index>
      </div>
      <Button
        type="button"
        variant="outline"
        class="mt-3 [.admin-workspace_&]:border-0 [.admin-workspace_&]:bg-surface-muted/70 dark:[.admin-workspace_&]:bg-slate-800/70"
        onClick={state.add}
      >
        Highlight hinzufügen
      </Button>
    </div>
  )
}
