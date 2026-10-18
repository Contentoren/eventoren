import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DataTableBreakpoint, DataTableColumn } from "./DataTableColumn.ts"
import type { DataTableSortDirection } from "./dataTableSort.ts"

export type DataTableSortState = { columnId: string; direction: DataTableSortDirection } | null

export function dataTableStateCreate<T>(inputs: {
  readonly columns: () => readonly DataTableColumn<T>[]
  readonly initialSort?: { columnId: string; direction: DataTableSortDirection }
  readonly initialBreakpoint?: DataTableBreakpoint
}) {
  const sort = createSignalObject<DataTableSortState>(inputs.initialSort ? { ...inputs.initialSort } : null)
  const breakpoint = inputs.initialBreakpoint ?? "md"

  const sortableColumns = () => inputs.columns().filter((column) => column.sortValue)

  const sortToggle = (column: DataTableColumn<T>) => {
    if (!column.sortValue) return
    const current = sort.get()
    if (!current || current.columnId !== column.id) {
      sort.set({ columnId: column.id, direction: "asc" })
      return
    }
    sort.set({ columnId: column.id, direction: current.direction === "asc" ? "desc" : "asc" })
  }

  const sortClear = () => sort.set(null)

  const sortDirection = (columnId: string): DataTableSortDirection | null => {
    const current = sort.get()
    if (!current || current.columnId !== columnId) return null
    return current.direction
  }

  const sortAria = (columnId: string): "ascending" | "descending" | "none" => {
    const direction = sortDirection(columnId)
    if (direction === "asc") return "ascending"
    if (direction === "desc") return "descending"
    return "none"
  }

  return { sort, breakpoint, sortableColumns, sortToggle, sortClear, sortDirection, sortAria }
}

export type DataTableState = ReturnType<typeof dataTableStateCreate<never>>
