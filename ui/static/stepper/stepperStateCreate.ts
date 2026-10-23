import { cn } from "cn"
import type { StepperOrientation } from "#ui/static/stepper/Stepper.jsx"

export function stepperStateCreate(input: {
  steps: () => readonly { id: string }[]
  current: () => number
  orientation: () => StepperOrientation
}) {
  const total = () => input.steps().length

  const statusOf = (index: number): "done" | "current" | "todo" => {
    if (index < input.current()) return "done"
    if (index === input.current()) return "current"
    return "todo"
  }

  const dotClass = (index: number) =>
    cn(
      "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold",
      statusOf(index) === "done" && "border-brand bg-brand text-brand-content",
      statusOf(index) === "current" && "border-brand text-brand ring-2 ring-ring",
      statusOf(index) === "todo" && "border-border-subtle bg-surface text-content-muted",
    )

  const labelClass = (index: number) =>
    cn("text-sm", statusOf(index) === "todo" ? "font-normal text-content-muted" : "font-medium text-content")

  const connectorClass = (index: number) =>
    cn(
      "flex-1",
      input.orientation() === "horizontal" ? "h-0.5" : "w-0.5 self-stretch",
      statusOf(index) === "done" ? "bg-brand" : "bg-border-subtle",
    )

  const progressPercent = () => (total() <= 1 ? 100 : Math.round((input.current() / (total() - 1)) * 100))

  return { total, statusOf, dotClass, labelClass, connectorClass, progressPercent }
}
