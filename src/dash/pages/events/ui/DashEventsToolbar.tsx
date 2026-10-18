import { mdiFormatListBulleted } from "@adaptive-ds/mdi/mdiFormatListBulleted.js"
import { mdiMagnify } from "@adaptive-ds/mdi/mdiMagnify.js"
import { mdiViewGridOutline } from "@adaptive-ds/mdi/mdiViewGridOutline.js"
import { For, Show } from "solid-js"
import { FilterChip } from "#ui/interactive/chip/FilterChip.jsx"
import { Input } from "#ui/input/input/Input.jsx"
import { SegmentedControl } from "#ui/input/segmented/SegmentedControl.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import type { DashEventCategory } from "../../../model/dashEventCategorySchema.ts"
import type { DashEventListCategory } from "../model/dashEventListFilter.ts"
import type { DashEventsAnsicht } from "../dashEventsPageStateCreate.ts"
import { dashEventsToolbarStateCreate } from "./dashEventsToolbarStateCreate.ts"

export interface DashEventsToolbarProps {
  q: string
  onQ: (value: string) => void
  categories: Array<DashEventListCategory>
  activeCategory: DashEventCategory | null
  onCategory: (value: DashEventCategory) => void
  ansicht: DashEventsAnsicht
  onAnsicht: (value: DashEventsAnsicht) => void
}

/** Suche, Kategorie-Chips und Listen-/Kachel-Umschalter für die Events-Liste. */
export function DashEventsToolbar(p: DashEventsToolbarProps) {
  const state = dashEventsToolbarStateCreate({
    categories: () => p.categories,
    activeCategory: () => p.activeCategory,
  })

  return (
    <div class="flex flex-col gap-3">
      <div class="flex flex-wrap items-center gap-2">
        <label class="relative min-w-52 flex-1 sm:max-w-xs">
          <span class="sr-only">Events suchen</span>
          <Icon
            path={mdiMagnify}
            class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-content-muted"
          />
          <Input
            type="search"
            value={p.q}
            onInput={(event) => p.onQ(event.currentTarget.value)}
            placeholder="Titel, Ort, Stadt …"
            aria-label="Events suchen"
            class="h-9 rounded-control pl-9 text-sm"
          />
        </label>
        <SegmentedControl
          value={p.ansicht}
          onChange={(value) => p.onAnsicht(value as DashEventsAnsicht)}
          ariaLabel="Ansicht wählen"
          size="sm"
          options={[
            { value: "liste", label: "Liste", icon: mdiFormatListBulleted },
            { value: "kacheln", label: "Kacheln", icon: mdiViewGridOutline },
          ]}
        />
      </div>
      <Show when={state.showCategories()}>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Nach Kategorie filtern">
          <For each={p.categories}>
            {(item) => (
              <FilterChip
                active={p.activeCategory === item.value}
                onClick={() => p.onCategory(item.value)}
                count={item.count}
              >
                {item.label}
              </FilterChip>
            )}
          </For>
        </div>
      </Show>
    </div>
  )
}
