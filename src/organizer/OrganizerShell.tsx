import type { ParentProps } from "solid-js"
import { AdminShell } from "../admin/AdminShell.tsx"

export function OrganizerShell(props: ParentProps) {
  return <AdminShell area="organizer">{props.children}</AdminShell>
}
