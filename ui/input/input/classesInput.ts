import { classesDisabledModifier } from "#ui/classes/classesDisabledModifier.js"
import { classArr } from "#ui/utils/classArr.js"

export const classesInput = classArr(
  "inline-flex", // layout
  "w-full", // sizing
  "bg-surface-muted text-content", // bg/text
  "border border-input", // borders
  "rounded-md", // border radius
  "px-3 py-2", // spacing
  "placeholder:text-muted-foreground", // typography
  "file:border-0 file:bg-transparent file:font-medium", // file input styling
  "focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-offset-2 ring-offset-background", // focus states
  classesDisabledModifier, // disabled
)
