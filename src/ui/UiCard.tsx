import type { JSX } from "solid-js"

export function UiCard(props: { children: JSX.Element; padded?: boolean; class?: string }) {
  return (
    <div
      class={`rounded-card border border-border-strong bg-surface text-content ${
        props.padded === false ? "" : "p-space-6"
      } ${props.class ?? ""}`.trim()}
    >
      {props.children}
    </div>
  )
}
