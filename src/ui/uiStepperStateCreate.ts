import { createMemo } from "solid-js"
import type { UiStepperItem } from "./UiStepperItem.ts"

export function uiStepperStateCreate(inputs: { labels: () => readonly string[]; currentIndex: () => number }) {
  const items = createMemo<UiStepperItem[]>(() =>
    inputs.labels().map((label, index) => ({
      label,
      index,
      status: index < inputs.currentIndex() ? "done" : index === inputs.currentIndex() ? "current" : "upcoming",
    })),
  )

  const progressLabel = createMemo(() => `Schritt ${inputs.currentIndex() + 1} von ${inputs.labels().length}`)

  return { items, progressLabel }
}
