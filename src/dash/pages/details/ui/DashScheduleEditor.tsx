import { mdiCalendarClockOutline } from "@adaptive-ds/mdi/mdiCalendarClockOutline.js"
import { mdiDragVertical } from "@adaptive-ds/mdi/mdiDragVertical.js"
import { mdiPlus } from "@adaptive-ds/mdi/mdiPlus.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { ButtonIconOnly } from "#ui/interactive/button/ButtonIconOnly.jsx"
import { EmptyState } from "#ui/static/empty/EmptyState.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"

import type { DashScheduleItem } from "../../../model/dashScheduleItemSchema.ts"
import { DashScheduleEditorStateCreate } from "./DashScheduleEditorStateCreate.ts"

/** Kontrollierter Editor für dein Programm: Zeiten, Titel und Details mit Drag-Sortierung. */
export function DashScheduleEditor(p: {
  items: DashScheduleItem[]
  onChange: (items: DashScheduleItem[]) => void
  event: { doorsAt: string | null; startsAt: string; endsAt: string }
  disabled?: boolean
}) {
  const state = DashScheduleEditorStateCreate({ items: () => p.items, onChange: p.onChange, event: () => p.event })

  return (
    <div class="flex flex-col gap-3">
      <Show when={state.outOfOrder()}>
        <div class="flex justify-end">
          <Button
            type="button"
            variant="link"
            class="h-9 px-3 text-sm"
            disabled={p.disabled}
            onClick={state.sortByTime}
          >
            Sortieren nach Uhrzeit
          </Button>
        </div>
      </Show>
      <Show when={p.items.length === 0}>
        <EmptyState
          icon={mdiCalendarClockOutline}
          title="Noch kein Programmpunkt"
          description="Erzeuge dein Programm aus deinen Eventzeiten oder lege Punkte manuell an."
          size="sm"
          class="rounded-card border border-border-subtle"
          actions={
            <Button
              type="button"
              variant="contrast"
              class="h-9 px-3 text-sm"
              disabled={p.disabled}
              onClick={state.buildFromEvent}
            >
              <Icon path={mdiCalendarClockOutline} class="size-4" />
              Aus Eventdaten erzeugen
            </Button>
          }
        />
      </Show>
      <For each={p.items}>
        {(item) => (
          <div
            class={cn(
              "flex flex-wrap items-center gap-2 rounded-card border border-border-subtle bg-surface p-2",
              state.isDragging(item.id) && "opacity-50",
            )}
            onDragOver={state.allowDrop}
            onDrop={(domEvent) => state.dropOn(item.id, domEvent)}
          >
            <span
              role="button"
              tabindex={p.disabled ? undefined : 0}
              aria-label={`${item.title === "" ? "Programmpunkt" : item.title} sortieren`}
              title="Zum Sortieren ziehen"
              class="shrink-0 cursor-grab touch-none rounded-control p-1 text-content-muted hover:bg-surface-muted active:cursor-grabbing"
              draggable={!p.disabled}
              onDragStart={(domEvent) => state.startDrag(item.id, domEvent)}
              onDragEnd={state.endDrag}
            >
              <Icon path={mdiDragVertical} class="size-5" />
            </span>
            <Input
              type="time"
              class="w-28"
              value={item.time}
              disabled={p.disabled}
              aria-label="Uhrzeit"
              onInput={(domEvent) => state.updateItem(item.id, { time: domEvent.currentTarget.value })}
            />
            <Input
              class="min-w-32 flex-1"
              value={item.title}
              disabled={p.disabled}
              placeholder="Titel"
              aria-label="Titel"
              onInput={(domEvent) => state.updateItem(item.id, { title: domEvent.currentTarget.value })}
            />
            <Input
              class="min-w-32 flex-1"
              value={item.detail}
              disabled={p.disabled}
              placeholder="Details (optional)"
              aria-label="Details"
              onInput={(domEvent) => state.updateItem(item.id, { detail: domEvent.currentTarget.value })}
            />
            <ButtonIconOnly
              type="button"
              variant="ghost"
              icon={mdiTrashCanOutline}
              title="Punkt entfernen"
              aria-label="Punkt entfernen"
              disabled={p.disabled}
              onClick={() => state.removeItem(item.id)}
            />
          </div>
        )}
      </For>
      <div>
        <Button type="button" variant="outline" class="h-9 px-3 text-sm" disabled={p.disabled} onClick={state.addItem}>
          <Icon path={mdiPlus} class="size-4" />
          Punkt hinzufügen
        </Button>
      </div>
    </div>
  )
}
