import type { JSX } from "solid-js"

export function DemoScenarioFrame(props: { readonly currentId: string; readonly children: JSX.Element }) {
  return props.children
}
