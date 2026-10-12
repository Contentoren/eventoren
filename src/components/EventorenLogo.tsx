import { Show } from "solid-js"
import { classMerge } from "../ui/classMerge.ts"

export function EventorenLogo(
  props: { readonly class?: string; readonly iconClass?: string; readonly iconOnly?: boolean } = {},
) {
  return (
    <span class={classMerge("flex items-center gap-2", props.class)}>
      <img
        src="/logo.svg"
        alt=""
        aria-hidden="true"
        decoding="async"
        class={props.iconClass ?? "h-8 w-auto shrink-0"}
      />
      <Show when={!props.iconOnly}>
        <span class="flex min-w-0 flex-col leading-none">
          <span class="truncate text-lg font-extrabold tracking-tight text-content">eventoren</span>
          <span class="truncate text-[10px] font-medium text-content-muted">eine Marke von Semesterkur</span>
        </span>
      </Show>
    </span>
  )
}
