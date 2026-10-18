import type { SegmentedControlSize } from "#ui/input/segmented/SegmentedControl.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

const sizeClass: Record<SegmentedControlSize, string> = {
  sm: "px-2.5 py-1.5 text-xs",
  md: "px-3.5 py-2 text-sm",
}

export function segmentedControlStateCreate(input: {
  value: () => string
  options: () => readonly { value: string }[]
  onChange: (value: string) => void
  size: () => SegmentedControlSize
  fullWidth: () => boolean
  extraClass?: () => string | undefined
}) {
  const rootClass = () =>
    classMerge(
      "inline-flex max-w-full items-center gap-1 overflow-x-auto rounded-control border border-border-subtle bg-surface-muted p-1",
      input.fullWidth() && "flex w-full",
      input.extraClass?.(),
    )

  const optionClass = (selected: boolean) =>
    classMerge(
      "inline-flex min-h-10 flex-none cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap rounded-[8px] font-medium transition-colors focus-ring",
      sizeClass[input.size()],
      input.fullWidth() && "flex-1",
      selected ? "bg-surface text-content shadow-sm" : "text-content-muted hover:text-content",
    )

  const optionIndex = (value: string) => input.options().findIndex((option) => option.value === value)

  const optionId = (index: number) => `segmented-option-${index}`

  const activeIndex = () => optionIndex(input.value())

  const focusOption = (index: number) => {
    document.getElementById(optionId(index))?.focus()
  }

  const selectIndex = (index: number) => {
    const option = input.options()[index]
    if (option) input.onChange(option.value)
  }

  const move = (delta: 1 | -1) => {
    const options = input.options()
    if (options.length === 0) return
    const next = (activeIndex() + delta + options.length) % options.length
    selectIndex(next)
    focusOption(next)
  }

  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      event.preventDefault()
      move(1)
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      event.preventDefault()
      move(-1)
    }
  }

  return { rootClass, optionClass, optionIndex, optionId, activeIndex, selectIndex, onKeyDown }
}
