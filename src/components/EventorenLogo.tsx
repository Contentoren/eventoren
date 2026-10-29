import { cn } from "cn"
import { Show } from "solid-js"
import { Img } from "#ui/static/img/Img.jsx"
import { urlDocument } from "../app/assets/urlDocument.ts"

export function EventorenLogo(
  props: { readonly class?: string; readonly iconClass?: string; readonly iconOnly?: boolean } = {},
) {
  return (
    <span class={cn("flex items-center gap-2", props.class)}>
      <Img src={urlDocument("logo.svg")} alt="" ariaHidden class={props.iconClass ?? "h-8 w-auto shrink-0"} />
      <Show when={!props.iconOnly}>
        <span class="flex min-w-0 flex-col leading-none">
          <span class="truncate text-lg font-extrabold tracking-tight text-content">eventoren</span>
          <span class="truncate text-[10px] font-medium text-content-muted">eine Marke von Semesterkur</span>
        </span>
      </Show>
    </span>
  )
}
