import { createMemo } from "solid-js"
import type { EventCategory } from "./EventCategory.ts"
import type { EventFilter } from "./EventFilter.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventTimeWindowLabels } from "./eventTimeWindowLabels.ts"

export function eventFilterBarStateCreate(inputs: {
  filter: () => EventFilter
  onFilterChange: (filter: EventFilter) => void
  resultCount: () => number
}) {
  const categoryOptions = createMemo(() => [
    { value: "alle" as const, label: "Alle Kategorien" },
    ...(Object.keys(eventCategoryLabels) as EventCategory[]).map((value) => ({
      value,
      label: eventCategoryLabels[value],
    })),
  ])

  const timeWindowOptions = createMemo(() =>
    (Object.keys(eventTimeWindowLabels) as EventTimeWindow[]).map((value) => ({
      value,
      label: eventTimeWindowLabels[value],
    })),
  )

  const resultLabel = createMemo(() =>
    inputs.resultCount() === 1 ? "1 Event gefunden" : `${inputs.resultCount()} Events gefunden`,
  )

  const selectQuery = (query: string) => inputs.onFilterChange({ ...inputs.filter(), query })
  const selectCategory = (category: EventFilter["category"]) => inputs.onFilterChange({ ...inputs.filter(), category })
  const selectTimeWindow = (timeWindow: EventTimeWindow) => inputs.onFilterChange({ ...inputs.filter(), timeWindow })

  return { categoryOptions, timeWindowOptions, resultLabel, selectQuery, selectCategory, selectTimeWindow }
}
