import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { For, Show } from "solid-js"
import { Input } from "#ui/input/input/Input.jsx"
import { Button } from "#ui/interactive/button/Button.jsx"
import { CorvuPopover } from "#ui/interactive/popover/CorvuPopover.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import { dashEventSwitcherStateCreate } from "./dashEventSwitcherStateCreate.ts"

export function DashEventSwitcher() {
  const state = dashEventSwitcherStateCreate()
  return (
    <CorvuPopover
      variant="ghost"
      size="none"
      class="mt-1 flex w-full items-center gap-2.5 rounded-control px-2 py-1.5 text-left"
      innerClass="w-80 p-1"
      open={state.open.get()}
      onOpenChange={state.open.set}
      buttonChildren={
        <>
          <Show
            when={state.imageUrl()}
            fallback={<span class="h-7 w-10 shrink-0 rounded-md bg-surface-muted" aria-hidden="true" />}
          >
            {(src) => <img src={src()} alt="" class="h-7 w-10 shrink-0 rounded-md object-cover" loading="lazy" />}
          </Show>
          <span class="min-w-0 flex-1 leading-tight">
            <span class="block truncate text-sm font-medium text-content">{state.title()}</span>
            <Show when={state.dateLabel()}>
              {(label) => <span class="block truncate text-xs text-content-muted">{label()}</span>}
            </Show>
          </span>
          <Show when={state.live()}>
            <span class="size-2 shrink-0 rounded-full bg-emerald-500 dark:bg-emerald-400" aria-label="Live" />
          </Show>
        </>
      }
    >
      <Input
        type="search"
        ref={(element) => element?.focus()}
        placeholder="Event suchen …"
        aria-label="Event suchen"
        class="h-9 text-sm"
        value={state.query.get()}
        onInput={(event) => state.query.set(event.currentTarget.value)}
      />
      <div class="mt-1 max-h-80 overflow-auto">
        <For
          each={state.filtered()}
          fallback={<p class="px-2 py-3 text-sm text-content-muted">Keine Events gefunden.</p>}
        >
          {(event) => (
            <Button
              variant="ghost"
              size="none"
              onClick={() => state.select(event.id)}
              aria-current={state.currentId() === event.id ? "true" : undefined}
              class="flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left hover:bg-surface-muted"
            >
              <Show
                when={event.imageUrl}
                fallback={<span class="h-7 w-10 shrink-0 rounded-md bg-surface-muted" aria-hidden="true" />}
              >
                <img src={event.imageUrl} alt="" class="h-7 w-10 shrink-0 rounded-md object-cover" loading="lazy" />
              </Show>
              <span class="min-w-0 flex-1 leading-tight">
                <span class="block truncate text-sm text-content">{event.title}</span>
                <span class="block truncate text-xs text-content-muted">
                  {dashDateFormat(event.startsAt, "wochentag-datum")}
                </span>
              </span>
              <Show when={state.currentId() === event.id}>
                <Icon path={mdiCheck} class="size-4 shrink-0 text-content" />
              </Show>
            </Button>
          )}
        </For>
      </div>
      <div class="mt-1 border-t border-border-subtle pt-1">
        <Button
          variant="ghost"
          size="none"
          onClick={() => state.allEvents()}
          class="flex h-10 w-full items-center rounded-md px-2 text-left text-sm text-content hover:bg-surface-muted"
        >
          Alle Events
        </Button>
      </div>
    </CorvuPopover>
  )
}
