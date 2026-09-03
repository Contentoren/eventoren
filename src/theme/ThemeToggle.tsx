import { Show } from "solid-js"
import { classMerge } from "../ui/classMerge.ts"
import type { ThemeMode } from "./ThemeMode.ts"
import { themeToggleStateCreate } from "./themeToggleStateCreate.ts"

function ThemeModeIcon(props: { mode: () => ThemeMode }) {
  return (
    <Show
      when={props.mode() === "dark"}
      fallback={
        <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
          <path d="M20 15.3A8.5 8.5 0 018.7 4 8.5 8.5 0 1020 15.3z" stroke-width="1.6" stroke-linejoin="round" />
        </svg>
      }
    >
      <svg viewBox="0 0 24 24" aria-hidden="true" class="size-5" fill="none" stroke="currentColor">
        <circle cx="12" cy="12" r="3.5" stroke-width="1.6" />
        <path
          d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"
          stroke-width="1.6"
          stroke-linecap="round"
        />
      </svg>
    </Show>
  )
}

export function ThemeToggle(props: { class?: string } = {}) {
  const state = themeToggleStateCreate()

  return (
    <button
      type="button"
      onClick={() => state.toggle()}
      aria-label={state.toggleLabel()}
      title={state.toggleLabel()}
      class={classMerge(
        "focus-ring inline-flex h-10 items-center gap-space-2 rounded-control px-space-3 text-content transition-colors hover:bg-surface-muted",
        props.class,
      )}
    >
      <ThemeModeIcon mode={state.mode} />
      <span class="sr-only">{state.toggleLabel()}</span>
    </button>
  )
}
