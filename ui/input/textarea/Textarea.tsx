import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { classesDisabledModifier } from "#ui/classes/classesDisabledModifier.js"
import { classMerge } from "#ui/utils/classMerge.js"

/** Styled native multiline textarea element. */
export const Textarea: Component<ComponentProps<"textarea">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return (
    <textarea
      class={classMerge(
        "flex", // layout
        "min-h-[80px] w-full", // sizing
        "bg-surface-muted text-content", // bg/text
        "rounded-md border border-input", // borders
        "placeholder:text-muted-foreground", // typography
        "px-3 py-2", // spacing
        "focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring focus-visible:ring-offset-2 ring-offset-background", // focus states
        classesDisabledModifier, // disabled
        s.class,
      )}
      {...rest}
    />
  )
}
