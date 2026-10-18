import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function dashCommandPaletteHostStateCreate() {
  const open = createSignalObject(false)
  const query = createSignalObject("")
  const requestOpen = () => {
    query.set("")
    open.set(true)
  }
  const setOpen = (next: boolean) => {
    if (!next) query.set("")
    open.set(next)
  }
  return { open, query, requestOpen, setOpen }
}

export type DashCommandPaletteHostState = ReturnType<typeof dashCommandPaletteHostStateCreate>
