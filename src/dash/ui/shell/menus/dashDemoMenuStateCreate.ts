import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function dashDemoMenuStateCreate() {
  const resetOpen = createSignalObject(false)
  return { resetOpen }
}

export type DashDemoMenuState = ReturnType<typeof dashDemoMenuStateCreate>
