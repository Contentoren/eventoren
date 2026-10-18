import { createUniqueId } from "solid-js"
import type { ToggleSwitchSize } from "#ui/input/toggle/ToggleSwitch.jsx"
import { classMerge } from "#ui/utils/classMerge.js"

const trackSizeClass: Record<ToggleSwitchSize, string> = {
  sm: "h-6 w-11",
  md: "h-8 w-14",
}

const thumbSizeClass: Record<ToggleSwitchSize, string> = {
  sm: "size-5",
  md: "size-7",
}

const thumbOffsetClass: Record<ToggleSwitchSize, string> = {
  sm: "translate-x-5",
  md: "translate-x-6",
}

export function toggleSwitchStateCreate(input: {
  checked: () => boolean
  onChange: (checked: boolean) => void
  disabled: () => boolean
  size: () => ToggleSwitchSize
  id: () => string | undefined
}) {
  const generatedId = createUniqueId()
  const controlId = () => input.id() ?? generatedId

  const trackClass = () =>
    classMerge(
      "relative inline-flex shrink-0 cursor-pointer items-center rounded-full border transition-colors focus-ring",
      trackSizeClass[input.size()],
      input.checked() ? "border-brand bg-brand dark:bg-brand" : "border-border-subtle bg-surface-muted",
      input.disabled() && "cursor-not-allowed opacity-50",
    )

  const thumbClass = () =>
    classMerge(
      "inline-block rounded-full bg-white shadow transition-transform dark:bg-slate-900",
      thumbSizeClass[input.size()],
      input.checked() && thumbOffsetClass[input.size()],
    )

  const toggle = () => {
    if (input.disabled()) return
    input.onChange(!input.checked())
  }

  return { controlId, trackClass, thumbClass, toggle }
}
