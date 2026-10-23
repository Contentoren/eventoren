import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { mdiChevronUp } from "@adaptive-ds/mdi/mdiChevronUp.js"
import { mdiDragVertical } from "@adaptive-ds/mdi/mdiDragVertical.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Textarea } from "#ui/input/textarea/Textarea.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashFaqItem } from "../../../model/dashFaqItemSchema.ts"
import { DashFaqEditorStateCreate } from "./DashFaqEditorStateCreate.ts"

/** Kontrollierter Editor für deine FAQ: aufklappbare Fragen mit Vorschlägen und Drag-Sortierung. */
export function DashFaqEditor(p: {
  items: DashFaqItem[]
  onChange: (items: DashFaqItem[]) => void
  disabled?: boolean
}) {
  const state = DashFaqEditorStateCreate({ items: () => p.items, onChange: p.onChange })

  return (
    <div class="flex flex-col gap-3">
      <Show when={state.visibleSuggestions().length > 0}>
        <div class="flex flex-wrap gap-2" aria-label="Vorschläge">
          <For each={state.visibleSuggestions()}>
            {(suggestion) => (
              <FilterChip active={false} onClick={() => state.addSuggestion(suggestion)}>
                {suggestion.label}
              </FilterChip>
            )}
          </For>
        </div>
      </Show>
      <For each={p.items}>
        {(item) => (
          <div
            class={cn("rounded-card border border-border-subtle bg-surface", state.isDragging(item.id) && "opacity-50")}
            onDragOver={state.allowDrop}
            onDrop={(domEvent) => state.dropOn(item.id, domEvent)}
          >
            <div class="flex items-center gap-2 p-2">
              <span
                role="button"
                tabindex={p.disabled ? undefined : 0}
                aria-label={`${item.question === "" ? "Frage" : item.question} sortieren`}
                title="Zum Sortieren ziehen"
                class="shrink-0 cursor-grab touch-none rounded-control p-1 text-content-muted hover:bg-surface-muted active:cursor-grabbing"
                draggable={!p.disabled}
                onDragStart={(domEvent) => state.startDrag(item.id, domEvent)}
                onDragEnd={state.endDrag}
              >
                <Icon path={mdiDragVertical} class="size-5" />
              </span>
              <Button
                type="button"
                variant="ghost"
                class="h-9 min-w-0 flex-1 justify-between px-3 text-sm"
                disabled={p.disabled}
                aria-expanded={state.isExpanded(item.id)}
                onClick={() => state.toggle(item.id)}
              >
                <span class="truncate">{item.question === "" ? "Neue Frage" : item.question}</span>
                <Icon path={state.isExpanded(item.id) ? mdiChevronUp : mdiChevronDown} class="size-4 shrink-0" />
              </Button>
              <ButtonIconOnly
                type="button"
                variant="ghost"
                icon={mdiTrashCanOutline}
                title="Frage entfernen"
                aria-label="Frage entfernen"
                disabled={p.disabled}
                onClick={() => state.removeItem(item.id)}
              />
            </div>
            <Show when={state.isExpanded(item.id)}>
              <div class="flex flex-col gap-2 p-2 pt-0">
                <Input
                  class="w-full"
                  value={item.question}
                  disabled={p.disabled}
                  placeholder="Frage"
                  aria-label="Frage"
                  onInput={(domEvent) => state.updateItem(item.id, { question: domEvent.currentTarget.value })}
                />
                <Textarea
                  class="w-full"
                  rows={3}
                  value={item.answer}
                  disabled={p.disabled}
                  placeholder="Antwort für deine Gäste"
                  aria-label="Antwort"
                  onInput={(domEvent) => state.updateItem(item.id, { answer: domEvent.currentTarget.value })}
                />
              </div>
            </Show>
          </div>
        )}
      </For>
      <div>
        <Button type="button" variant="outline" class="h-9 px-3 text-sm" disabled={p.disabled} onClick={state.addItem}>
          <Icon path={mdiPlus} class="size-4" />
          Frage hinzufügen
        </Button>
      </div>
    </div>
  )
}
