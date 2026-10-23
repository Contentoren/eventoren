import { mdiCheck } from "@adaptive-ds/mdi/mdiCheck.js"
import { cn } from "cn"
import { For, Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { stepperStateCreate } from "#ui/static/stepper/stepperStateCreate.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type StepperOrientation = "horizontal" | "vertical"

export interface StepperStep {
  id: string
  label: string
  description?: string
}

export interface StepperProps extends MayHaveClass {
  steps: StepperStep[]
  current: number
  orientation?: StepperOrientation
  onStepClick?: (index: number) => void
}

/** Schritt-Anzeige: erledigt mit Haken, aktuell mit Brand-Ring, mobil kompakt. */
export function Stepper(p: StepperProps) {
  const orientation = () => p.orientation ?? "horizontal"
  const state = stepperStateCreate({ steps: () => p.steps, current: () => p.current, orientation })

  const clickable = (index: number) => p.onStepClick !== undefined && index < p.current

  return (
    <nav aria-label="Fortschritt" class={p.class}>
      <Show when={orientation() === "horizontal"}>
        <div class="sm:hidden">
          <p class="text-sm font-medium text-content" aria-live="polite">
            Schritt {Math.min(p.current + 1, state.total())} von {state.total()}
          </p>
          <div
            role="progressbar"
            aria-valuemin={1}
            aria-valuemax={state.total()}
            aria-valuenow={Math.min(p.current + 1, state.total())}
            class="mt-2 h-1.5 overflow-hidden rounded-full bg-surface-muted"
          >
            <div class="h-full rounded-full bg-brand transition-all" style={{ width: `${state.progressPercent()}%` }} />
          </div>
        </div>
      </Show>
      <ol
        class={cn(
          orientation() === "horizontal" ? "hidden gap-1 sm:flex" : "flex flex-col gap-1",
          orientation() === "horizontal" && "items-start",
        )}
      >
        <For each={p.steps}>
          {(step, index) => (
            <li
              class={cn(
                "flex min-h-10",
                orientation() === "horizontal" ? "flex-1 items-start gap-2" : "items-stretch gap-3",
              )}
            >
              <div
                class={cn(
                  "flex",
                  orientation() === "horizontal" ? "flex-col items-center gap-1" : "flex-col items-center",
                )}
              >
                {clickable(index()) ? (
                  <button
                    type="button"
                    onClick={() => p.onStepClick?.(index())}
                    aria-label={`${step.label} öffnen`}
                    class={cn(state.dotClass(index()), "cursor-pointer")}
                  >
                    <Show when={state.statusOf(index()) === "done"} fallback={<span>{index() + 1}</span>}>
                      <Icon path={mdiCheck} class="size-4" />
                    </Show>
                  </button>
                ) : (
                  <span class={state.dotClass(index())} aria-hidden="true">
                    <Show when={state.statusOf(index()) === "done"} fallback={<span>{index() + 1}</span>}>
                      <Icon path={mdiCheck} class="size-4" />
                    </Show>
                  </span>
                )}
              </div>
              <div class={cn("min-w-0", orientation() === "horizontal" ? "pt-1 text-center sm:text-left" : "pb-4")}>
                <p class={state.labelClass(index())}>
                  <span class="sr-only">
                    {state.statusOf(index()) === "done"
                      ? "Abgeschlossen: "
                      : state.statusOf(index()) === "current"
                        ? "Aktuell: "
                        : ""}
                  </span>
                  {step.label}
                </p>
                <Show when={step.description}>
                  <p class="text-xs text-content-muted">{step.description}</p>
                </Show>
              </div>
              <Show when={orientation() === "horizontal" && index() < state.total() - 1}>
                <div aria-hidden="true" class={cn(state.connectorClass(index()), "mx-1 mt-4 min-w-4")} />
              </Show>
            </li>
          )}
        </For>
      </ol>
    </nav>
  )
}
