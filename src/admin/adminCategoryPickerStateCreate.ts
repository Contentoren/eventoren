import { createMemo } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { eventCategoryLabels } from "../events/eventCategoryLabels.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"

export function adminCategoryPickerStateCreate(inputs: { catalog: AdminCatalogPageState }) {
  const isOpen = createSignalObject(false)
  const newCategory = createSignalObject("")
  const categoryOptions = createMemo(() => {
    const selectedCategory = inputs.catalog.eventDraft().category
    const hiddenCategories = inputs.catalog.hiddenCategories()
    return [
      ...new Set([
        ...Object.keys(eventCategoryLabels),
        ...inputs.catalog.events().map((event) => event.category),
        selectedCategory,
      ]),
    ].filter((category) => category === selectedCategory || !hiddenCategories.includes(category))
  })
  const categoryValue = {
    get: () => inputs.catalog.eventDraft().category,
    set: (value: string) => inputs.catalog.eventFieldChange("category", value),
  }

  const categoryPickerOpen = () => isOpen.get()
  const categoryPickerOpenChange = (open: boolean) => isOpen.set(open)
  const categoryPickerClose = () => isOpen.set(false)
  const categorySelect = (category: string) => {
    categoryValue.set(category)
    categoryPickerClose()
  }
  const categoryCreate = () => {
    const category = newCategory.get().trim()
    if (!category) return
    categorySelect(category)
    newCategory.set("")
  }
  const categoryRemove = (category: string) => inputs.catalog.hideCategory(category)

  return {
    categoryPickerOpen,
    categoryPickerOpenChange,
    categoryPickerClose,
    categoryOptions,
    categoryValue,
    categorySelect,
    newCategory,
    categoryCreate,
    categoryRemove,
  }
}
