import { Link } from "@tanstack/solid-router"
import { For, Show } from "solid-js"
import { Portal } from "solid-js/web"
import { Button } from "#ui/interactive/button/Button.jsx"
import { demoScenarioText } from "../model/demoScenarioText.ts"
import { demoControlsStateCreate } from "../state/demoControlsStateCreate.ts"

export function DemoControls(props: { readonly currentId: string | (() => string) }) {
  const state = demoControlsStateCreate({
    currentId: () => (typeof props.currentId === "function" ? props.currentId() : props.currentId),
  })

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
        {state.buttonText()}
      </Button>

      <Show when={state.open()}>
        <Portal>
          {/* biome-ignore lint/a11y/noStaticElementInteractions: backdrop click closes overlay */}
          <div
            class="fixed inset-0 z-50 flex items-end justify-end bg-black/20 p-space-4 sm:items-center"
            role="presentation"
            onClick={state.closeOverlay}
          >
            {/* biome-ignore lint/a11y/useKeyWithClickEvents: stopPropagation prevents backdrop closing */}
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
                  {state.titleText()}
                </h2>
                <Button variant="ghost" size="sm" type="button" onClick={state.closeOverlay}>
                  {state.closeText()}
                </Button>
              </div>
              <nav class="overflow-y-auto p-space-3" aria-label={state.titleText()}>
                <Link
                  to="/demo"
                  class="focus-ring mb-space-2 block rounded-control px-space-3 py-space-2 text-sm font-semibold text-brand-accent hover:bg-surface-muted"
                  aria-current={state.isCurrent("directory") ? "page" : undefined}
                  onClick={state.closeOverlay}
                >
                  {state.directoryText()}
                </Link>

                <div class="mb-space-3 border-b border-border-subtle pb-space-3">
                  <div class="px-space-3 py-space-1 text-xs font-semibold uppercase tracking-wider text-content-subtle">
                    {state.quickEntriesTitle()}
                  </div>
                  <div class="mt-space-1 flex flex-col gap-space-1">
                    <For each={state.quickEntries()}>
                      {(entry) => (
                        <Link
                          to={entry.path}
                          class="focus-ring flex items-center justify-between rounded-control px-space-3 py-space-1.5 text-xs font-medium text-brand-accent hover:bg-surface-muted"
                          onClick={state.closeOverlay}
                        >
                          <span>{entry.title}</span>
                          <span class="rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-semibold text-brand-accent">
                            {entry.badge}
                          </span>
                        </Link>
                      )}
                    </For>
                  </div>
                </div>

                <div class="flex flex-col gap-space-4">
                  <For each={state.groups()}>
                    {(group) => (
                      <div>
                        <div class="px-space-3 py-space-1 text-xs font-semibold uppercase tracking-wider text-content-subtle">
                          {group.title}
                        </div>
                        <ul class="mt-space-1 flex flex-col gap-space-1">
                          <For each={group.scenarios}>
                            {(scenario) => (
                              <li>
                                <Link
                                  to={scenario.path}
                                  class="focus-ring block rounded-control px-space-3 py-space-2 text-sm transition-colors hover:bg-surface-muted"
                                  classList={{
                                    "bg-brand-soft font-semibold text-brand-accent": state.isCurrent(scenario.id),
                                    "text-content-muted": !state.isCurrent(scenario.id),
                                  }}
                                  aria-current={state.isCurrent(scenario.id) ? "page" : undefined}
                                  onClick={state.closeOverlay}
                                >
                                  {demoScenarioText(scenario).title}
                                </Link>
                              </li>
                            )}
                          </For>
                        </ul>
                      </div>
                    )}
                  </For>
                </div>
              </nav>
            </aside>
          </div>
        </Portal>
      </Show>
    </Show>
  )
}
