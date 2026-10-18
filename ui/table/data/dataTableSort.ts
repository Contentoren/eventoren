import type { DataTableColumn } from "./DataTableColumn.ts"

export type DataTableSortDirection = "asc" | "desc"

const collator = new Intl.Collator("de", { numeric: true })

/** Pure ascending/descending sort over visible rows, German collation with numeric ordering. */
export function dataTableSort<T>(
  rows: readonly T[],
  column: DataTableColumn<T>,
  direction: DataTableSortDirection,
): T[] {
  const sorted = [...rows]
  sorted.sort((left, right) => {
    const leftValue = column.sortValue?.(left)
    const rightValue = column.sortValue?.(right)
    const compared = dataTableSortCompare(leftValue, rightValue)
    return direction === "asc" ? compared : -compared
  })
  return sorted
}

function dataTableSortCompare(left: string | number | null | undefined, right: string | number | null | undefined) {
  const leftMissing = left === null || left === undefined
  const rightMissing = right === null || right === undefined
  if (leftMissing && rightMissing) return 0
  if (leftMissing) return 1
  if (rightMissing) return -1
  if (typeof left === "number" && typeof right === "number") return left - right
  return collator.compare(String(left), String(right))
}
