import { createMemo } from "solid-js"
import {
  commandPaletteFilterGroups,
  commandPaletteGroupResults,
  commandPaletteGroupsFlatten,
  type CommandPaletteFlatItem,
  type CommandPaletteRankedItem,
  type CommandPaletteResultGroup,
} from "#ui/interactive/command/commandPaletteFilter.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type CommandPaletteStateItem = {
  id: string
  label: string
  description?: string
  icon?: string
  keywords?: string[]
  hint?: string
}

export type CommandPaletteStateGroup = {
  id: string
  label: string
  items: CommandPaletteStateItem[]
}

export function commandPaletteStateCreate(p: { groups: () => CommandPaletteStateGroup[] }) {
  const query = createSignalObject("")
  const activeIndex = createSignalObject(0)
  let input: HTMLInputElement | null = null
  let list: HTMLElement | null = null

  const flatItems = createMemo<CommandPaletteFlatItem[]>(() =>
    commandPaletteGroupsFlatten(
      p.groups().map((group) => ({
        id: group.id,
        label: group.label,
        items: group.items.map((item) => ({
          id: item.id,
          label: item.label,
          description: item.description,
          keywords: item.keywords,
        })),
      })),
    ),
  )

  const rankedItems = createMemo<CommandPaletteRankedItem[]>(() => commandPaletteFilterGroups(flatItems(), query.get()))

  const globalIndexOf = (rankedId: string) => rankedItems().findIndex((item) => item.id === rankedId)

  const visibleGroups = createMemo<CommandPaletteResultGroup[]>(() =>
    commandPaletteGroupResults(
      rankedItems(),
      p.groups().map((group) => ({ id: group.id, label: group.label })),
    ),
  )

  const scrollActiveIntoView = () => {
    const ranked = rankedItems()[activeIndex.get()]
    if (!ranked) return
    list
      ?.querySelector<HTMLElement>(`[data-command-option="${CSS.escape(ranked.id)}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }

  const moveActive = (delta: number) => {
    const count = rankedItems().length
    if (count === 0) return
    activeIndex.set((activeIndex.get() + delta + count) % count)
    queueMicrotask(scrollActiveIntoView)
  }

  const setQuery = (next: string) => {
    query.set(next)
    activeIndex.set(0)
  }

  const setActiveById = (rankedId: string) => {
    const index = globalIndexOf(rankedId)
    if (index < 0) return
    activeIndex.set(index)
    queueMicrotask(scrollActiveIntoView)
  }

  const handleSearchKeyDown = (event: KeyboardEvent, onPick: (rankedId: string) => void) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      moveActive(1)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      moveActive(-1)
      return
    }
    if (event.key === "Enter") {
      event.preventDefault()
      const ranked = rankedItems()[activeIndex.get()]
      if (ranked) onPick(ranked.id)
    }
  }

  const handleOptionKeyDown = (event: KeyboardEvent, rankedId: string, onPick: (rankedId: string) => void) => {
    if (event.key === "ArrowDown") {
      event.preventDefault()
      setActiveById(rankedId)
      moveActive(1)
      return
    }
    if (event.key === "ArrowUp") {
      event.preventDefault()
      setActiveById(rankedId)
      moveActive(-1)
      return
    }
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault()
      onPick(rankedId)
    }
  }

  return {
    query: query.get,
    activeIndex: activeIndex.get,
    rankedItems,
    visibleGroups,
    globalIndexOf,
    setQuery,
    setActiveById,
    handleSearchKeyDown,
    handleOptionKeyDown,
    autofocus: () => {
      queueMicrotask(() => input?.focus({ preventScroll: true }))
    },
    registerInput: (element: HTMLInputElement | null) => {
      input = element
    },
    registerList: (element: HTMLElement | null) => {
      list = element
    },
  }
}
