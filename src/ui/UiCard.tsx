import { cn } from "cn"
import type { JSX } from "solid-js"

export function UiCard(props: { children: JSX.Element; padded?: boolean; class?: string }) {
  return (
    <div
      class={cn(
        "rounded-card border border-border-subtle bg-surface text-content",
        props.padded !== false && "p-space-6",
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
