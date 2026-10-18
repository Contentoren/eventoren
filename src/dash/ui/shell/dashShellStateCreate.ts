import { createUniqueId } from "solid-js"

export function dashShellStateCreate() {
  const drawerId = createUniqueId()
  return { drawerLabelId: `dash-drawer-${drawerId}` }
}
