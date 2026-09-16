import type { JSX } from "solid-js"
import { DemoControls } from "./DemoControls.tsx"

export function DemoScenarioFrame(props: { readonly currentId: string; readonly children: JSX.Element }) {
  return (
    <>
      <DemoControls currentId={props.currentId} />
      {props.children}
    </>
  )
}
