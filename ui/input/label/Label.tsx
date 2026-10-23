import { cn } from "cn"
import type { Component, ComponentProps } from "solid-js"
import { splitProps } from "solid-js"
import { classesLabel } from "#ui/input/label/classesLabel.js"

/** Styled native label element for form fields. */
export const Label: Component<ComponentProps<"label">> = (p) => {
  const [s, rest] = splitProps(p, ["class"])
  return <label class={cn(classesLabel, s.class)} {...rest} />
}
