import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"
import type { DashEventListCategory } from "../model/dashEventListFilter.ts"

export interface DashEventsToolbarInputs {
  categories: () => Array<DashEventListCategory>
  activeCategory: () => DashEventCategory | null
}

/** Abgeleitete Toolbar-Daten: Chips nur zeigen, wenn Kategorien vorhanden sind. */
export function dashEventsToolbarStateCreate(inputs: DashEventsToolbarInputs) {
  const showCategories = () => inputs.categories().length > 0
  return { showCategories }
}

export type DashEventsToolbarState = ReturnType<typeof dashEventsToolbarStateCreate>
