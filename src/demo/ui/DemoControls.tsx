import { For, Show } from "solid-js"
import { Link } from "@tanstack/solid-router"
import { Portal } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import { demoScenarioText } from "../model/demoScenarioText.ts"
import { demoText } from "../model/demoText.ts"
import { demoScenarios } from "../model/demoScenarios.js"
import { demoControlsStateCreate } from "../state/demoControlsStateCreate.ts"

export function DemoControls(props: { readonly currentId: string | (() => string) }) {
  const state = demoControlsStateCreate()
  const currentId = () => (typeof props.currentId === "function" ? props.currentId() : props.currentId)

  return (
    <Show when={!state.hidden}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        class="fixed bottom-4 right-4 z-40 rounded-full border-brand-accent bg-surface px-4 py-2 text-xs font-bold shadow-lg"
        aria-controls="demo-controls-dialog"
        aria-expanded={state.open()}
        onClick={state.openOverlay}
      >
        {demoText("controlsButton")}
      </Button>

      <Show when={state.open()}>
        <Portal>
          <div
            class="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-space-4 sm:items-center"
            role="presentation"
            onClick={state.closeOverlay}
          >
            <aside
              id="demo-controls-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby="demo-controls-title"
              class="flex max-h-[min(90vh,48rem)] w-full max-w-sm flex-col overflow-hidden rounded-card border border-border-subtle bg-surface text-content shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div class="flex items-center justify-between gap-space-3 border-b border-border-subtle px-space-5 py-space-4">
                <h2 id="demo-controls-title" class="font-semibold">
                  {demoText("controlsTitle")}
                </h2>
                <Button variant="ghost" size="sm" type="button" onClick={state.closeOverlay}>
                  {demoText("controlsClose")}
                </Button>
              </div>
              <nav class="overflow-y-auto p-space-3" aria-label={demoText("controlsTitle")}>
                <Link
                  to="/demo"
                  class="focus-ring mb-space-2 block rounded-control px-space-3 py-space-2 text-sm font-semibold text-brand-accent hover:bg-surface-muted"
                  aria-current={currentId() === "directory" ? "page" : undefined}
                >
                  {demoText("controlsDirectory")}
                </Link>
                <ul class="flex flex-col gap-space-1">
                  <For each={demoScenarios.filter((scenario) => scenario.id !== "directory")}>
                    {(scenario) => (
                      <li>
                        <Link
                          to={scenario.path}
                          class="focus-ring block rounded-control px-space-3 py-space-2 text-sm transition-colors hover:bg-surface-muted"
                          classList={{
                            "bg-brand-soft font-semibold text-brand-accent": scenario.id === currentId(),
                            "text-content-muted": scenario.id !== currentId(),
                          }}
                          aria-current={scenario.id === currentId() ? "page" : undefined}
                        >
                          {demoScenarioText(scenario).title}
                        </Link>
                      </li>
                    )}
                  </For>
                </ul>
              </nav>
            </aside>
          </div>
        </Portal>
      </Show>
    </Show>
  )
}
