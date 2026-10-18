import type { JSX } from "solid-js"

export type DataTableAlign = "left" | "right" | "center"

export type DataTableBreakpoint = "sm" | "md"

export type DataTableHideBelow = "sm" | "md" | "lg" | "xl"

export type DataTableColumn<T> = {
  id: string
  header: string
  cell: (row: T) => JSX.Element
  align?: DataTableAlign
  sortValue?: (row: T) => string | number | null
  headerClass?: string
  cellClass?: string
  hideBelow?: DataTableHideBelow
  width?: string
}
