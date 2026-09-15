import type { JSX } from "solid-js"
import { DemoShell } from "./DemoShell.tsx"

export function DemoOrganizerEventFrame(props: { readonly children?: JSX.Element }) {
  return <DemoShell currentId="organizer-event">{props.children}</DemoShell>
}
