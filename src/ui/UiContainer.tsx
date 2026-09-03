import type { JSX } from "solid-js"
import { classMerge } from "./classMerge.ts"

export function UiContainer(props: {
  children: JSX.Element
  width?: "narrow" | "default" | "wide"
  class?: string
  id?: string
}) {
  return (
    <div
      id={props.id}
      class={classMerge(
        "mx-auto w-full px-space-6",
        props.width === "narrow" ? "max-w-3xl" : props.width === "wide" ? "max-w-7xl" : "max-w-6xl",
        props.class,
      )}
    >
      {props.children}
    </div>
  )
}
