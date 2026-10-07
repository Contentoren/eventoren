import type { JSX } from "solid-js"
import { classMerge } from "./classMerge.ts"

export function UiCard(props: { children: JSX.Element; padded?: boolean; class?: string }) {
  return (
    <div
      class={classMerge(
        "rounded-card border border-border-subtle bg-surface text-content",
        props.padded !== false && "p-space-6",
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
