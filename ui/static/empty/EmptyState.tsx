import type { JSX } from "solid-js"
import { Show } from "solid-js"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { MayHaveClass } from "#ui/utils/MayHaveClass.js"

export type EmptyStateSize = "sm" | "md"

export interface EmptyStateProps extends MayHaveClass {
  icon: string
  title: string
  description?: string
  actions?: JSX.Element
  size?: EmptyStateSize
}

const iconBoxClasses: Record<EmptyStateSize, string> = {
  sm: "size-11 text-lg",
  md: "size-14 text-2xl",
}

/** Centered empty state: icon in a soft circle, one sentence, one action. */
export function EmptyState(p: EmptyStateProps) {
  const size = () => p.size ?? "md"
  return (
    <div class={classMerge("flex flex-col items-center gap-3 px-6 py-10 text-center", p.class)}>
      <span
        class={classMerge(
          "inline-flex items-center justify-center rounded-full bg-surface-muted text-content-muted",
          iconBoxClasses[size()],
        )}
      >
        <Icon path={p.icon} class={size() === "sm" ? "size-5" : "size-7"} />
      </span>
      <p class={classMerge("font-semibold text-content", size() === "sm" ? "text-sm" : "text-base")}>{p.title}</p>
      <Show when={p.description}>
        {(text) => <p class="max-w-sm text-sm leading-relaxed text-content-muted">{text()}</p>}
      </Show>
      <div class="mt-1 flex flex-wrap items-center justify-center gap-2 empty:hidden">{p.actions}</div>
    </div>
  )
}
