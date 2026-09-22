import { For, Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { demoNavbarControlsStateCreate } from "../state/demoNavbarControlsStateCreate.ts"

export function DemoNavbarControls() {
  const state = demoNavbarControlsStateCreate()

  return (
    <Show when={state.hasFlowStates()}>
      <aside
        aria-label="Demo-Zustandssteuerung"
        class="sticky top-16 z-20 border-b border-border-subtle bg-surface-base/95 px-4 py-2 backdrop-blur-sm shadow-xs"
      >
        <div class="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 text-xs">
          <div class="flex flex-wrap items-center gap-2">
            <span class="font-semibold text-content-muted">Demo-Zustand:</span>
            <div
              class="inline-flex rounded-md border border-border-subtle bg-surface-muted p-0.5"
              role="group"
              aria-label="Demo-Zustand auswählen"
            >
              <For each={state.options()}>
                {(option) => (
                  <Button
                    type="button"
                    size="sm"
                    variant={option.active() ? "contrast" : "ghost"}
                    class="h-7 px-2.5 text-xs font-medium"
                    aria-pressed={option.active()}
                    onClick={option.select}
                  >
                    {option.label}
                  </Button>
                )}
              </For>
            </div>
          </div>
          <Show when={state.showReset()}>
            <Button
              type="button"
              size="sm"
              variant="outline"
              class="h-7 px-2 text-xs font-normal text-content-muted hover:text-content"
              onClick={state.reset}
            >
              Standard wiederherstellen
            </Button>
          </Show>
        </div>
      </aside>
    </Show>
  )
}
