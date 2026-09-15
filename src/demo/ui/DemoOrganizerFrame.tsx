import type { JSX } from "solid-js"
import { DemoShell } from "./DemoShell.tsx"

export function DemoOrganizerFrame(props: { readonly children?: JSX.Element; readonly currentId?: string }) {
  return <DemoShell currentId={props.currentId ?? "organizer"}>{props.children}</DemoShell>
}
