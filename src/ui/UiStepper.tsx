import { For } from "solid-js"
import { classMerge } from "./classMerge.ts"
import { uiStepperStateCreate } from "./uiStepperStateCreate.ts"

export function UiStepper(props: { labels: readonly string[]; currentIndex: number; class?: string }) {
  const state = uiStepperStateCreate({
    labels: () => props.labels,
    currentIndex: () => props.currentIndex,
  })

  return (
    <ol class={classMerge("flex flex-wrap items-center gap-space-4", props.class)} aria-label={state.progressLabel()}>
      <For each={state.items()}>
        {(item) => (
          <li class="flex items-center gap-space-3" aria-current={item.status === "current" ? "step" : undefined}>
            <span
              class={classMerge(
                "flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-semibold",
                item.status === "upcoming"
                  ? "bg-surface-muted text-content-muted ring-1 ring-inset ring-border-strong"
                  : "bg-brand text-brand-content shadow-lg shadow-brand/30",
              )}
              aria-hidden="true"
            >
              {item.status === "done" ? "✓" : item.index + 1}
            </span>
            <span
              class={classMerge(
                "text-sm font-medium",
                item.status === "upcoming" ? "text-content-muted" : "text-content",
              )}
            >
              {item.label}
            </span>
          </li>
        )}
      </For>
    </ol>
  )
}
