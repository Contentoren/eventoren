import { cn } from "cn"

export function tabNavStateCreate(input: { ids: () => string[]; onSelect: (id: string) => void }) {
  const rootClass = (extra?: string) =>
    cn(
      "flex items-center gap-1 overflow-x-auto border-b border-border-subtle [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      extra,
    )

  const tabClass = (selected: boolean) =>
    cn(
      "inline-flex min-h-11 flex-none items-center gap-1.5 whitespace-nowrap border-b-2 px-3 text-sm font-medium transition-colors focus-ring",
      selected
        ? "border-brand text-content"
        : "border-transparent text-content-muted hover:border-border-subtle hover:text-content",
    )

  const focusTab = (index: number) => {
    document.querySelector<HTMLElement>(`[data-tabnav-index="${index}"]`)?.focus()
  }

  const selectIndex = (index: number) => {
    const id = input.ids()[index]
    if (id !== undefined) input.onSelect(id)
  }

  const onKeyDown = (event: KeyboardEvent, currentIndex: number) => {
    const ids = input.ids()
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      const next = (currentIndex + 1) % ids.length
      selectIndex(next)
      focusTab(next)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      const next = (currentIndex - 1 + ids.length) % ids.length
      selectIndex(next)
      focusTab(next)
    } else if (event.key === "Home") {
      event.preventDefault()
      selectIndex(0)
      focusTab(0)
    } else if (event.key === "End") {
      event.preventDefault()
      selectIndex(ids.length - 1)
      focusTab(ids.length - 1)
    }
  }

  return { rootClass, tabClass, focusTab, selectIndex, onKeyDown }
}
