import type { DropdownMenuEntry } from "#ui/interactive/menu/DropdownMenu.jsx"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

type DropdownMenuItem = Extract<DropdownMenuEntry, { type: "item" }>

export function dropdownMenuStateCreate(p: { items: () => DropdownMenuEntry[] }) {
  const open = createSignalObject(false)
  const active = createSignalObject(-1)
  let trigger: HTMLElement | null = null
  let menu: HTMLElement | null = null

  const selectables = (): DropdownMenuItem[] =>
    p.items().filter((entry): entry is DropdownMenuItem => entry.type === "item")

  const enabledPositions = (): number[] =>
    selectables()
      .map((item, index) => ({ item, index }))
      .filter(({ item }) => !item.disabled)
      .map(({ index }) => index)

  const focusIndex = (index: number) => {
    const item = selectables()[index]
    if (!item) return
    menu?.querySelector<HTMLElement>(`[data-dropdown-item-id="${CSS.escape(item.id)}"]`)?.focus({ preventScroll: true })
  }

  const handleOpenChange = (next: boolean) => {
    open.set(next)
    if (next) {
      active.set(-1)
      queueMicrotask(() => {
        const first = enabledPositions()[0]
        if (first === undefined) return
        active.set(first)
        focusIndex(first)
      })
    } else {
      active.set(-1)
      trigger?.focus({ preventScroll: true })
    }
  }

  const moveActive = (delta: number) => {
    const positions = enabledPositions()
    if (positions.length === 0) return
    const at = positions.indexOf(active.get())
    const next = positions[(at + delta + positions.length) % positions.length]
    if (next === undefined) return
    active.set(next)
    focusIndex(next)
  }

  const moveToEdge = (edge: "first" | "last") => {
    const positions = enabledPositions()
    const next = edge === "first" ? positions[0] : positions[positions.length - 1]
    if (next === undefined) return
    active.set(next)
    focusIndex(next)
  }

  const selectIndex = (index: number) => {
    const item = selectables()[index]
    if (!item || item.disabled) return
    handleOpenChange(false)
    item.onSelect()
  }

  const setActiveItem = (id: string) => {
    const index = selectables().findIndex((item) => item.id === id)
    if (index >= 0) active.set(index)
  }

  const activateItem = (id: string) => {
    const index = selectables().findIndex((entry) => entry.id === id)
    if (index >= 0) selectIndex(index)
  }

  const handleItemKeyDown = (event: KeyboardEvent, id: string) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveItem(id)
      moveActive(1)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveItem(id)
      moveActive(-1)
      return
    }
    if (event.key === "Home") {
      event.preventDefault()
      moveToEdge("first")
      return
    }
    if (event.key === "End") {
      event.preventDefault()
      moveToEdge("last")
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      setActiveItem(id)
      selectIndex(active.get())
      return
    }
    if (event.key === "Escape") {
      event.preventDefault()
      handleOpenChange(false)
    }
    if (event.key === "Tab") handleOpenChange(false)
  }

  const handleTriggerKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowDown" || event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      handleOpenChange(true)
    }
  }

  const isActive = (id: string) => {
    const index = selectables().findIndex((item) => item.id === id)
    return index >= 0 && index === active.get()
  }

  return {
    open: open.get,
    registerTrigger: (element: HTMLElement | null) => {
      trigger = element
    },
    registerMenu: (element: HTMLElement | null) => {
      menu = element
    },
    handleOpenChange,
    handleItemKeyDown,
    handleTriggerKeyDown,
    setActiveItem,
    activateItem,
    isActive,
  }
}
