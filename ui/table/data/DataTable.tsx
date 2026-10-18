import { mdiChevronDown } from "@adaptive-ds/mdi/mdiChevronDown.js"
import { mdiChevronUp } from "@adaptive-ds/mdi/mdiChevronUp.js"
import { mdiUnfoldMoreHorizontal } from "@adaptive-ds/mdi/mdiUnfoldMoreHorizontal.js"
import { For, Show, createMemo } from "solid-js"
import type { JSX } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { Checkbox } from "#ui/input/check/Checkbox.jsx"
import { Icon } from "#ui/static/icon/Icon.jsx"
import { classMerge } from "#ui/utils/classMerge.js"
import type { DataTableBreakpoint, DataTableColumn, DataTableHideBelow } from "./DataTableColumn.ts"
import { type DataTableSortDirection, dataTableSort } from "./dataTableSort.ts"
import { dataTableStateCreate } from "./dataTableStateCreate.ts"

export type DataTableProps<T> = {
  readonly rows: readonly T[]
  readonly rowKey: (row: T) => string
  readonly columns: readonly DataTableColumn<T>[]
  readonly ariaLabel: string
  readonly onRowClick?: (row: T) => void
  readonly activeRowKey?: string | null
  readonly selectable?: boolean
  readonly selectedKeys?: readonly string[]
  readonly onSelectedKeysChange?: (keys: string[]) => void
  readonly bulkActions?: (keys: string[]) => JSX.Element
  readonly initialSort?: { columnId: string; direction: DataTableSortDirection }
  readonly mobileCard?: (row: T) => JSX.Element
  readonly mobileBreakpoint?: DataTableBreakpoint
  readonly loading?: boolean
  readonly skeletonRows?: number
  readonly empty?: JSX.Element
  readonly stickyHeaderClass?: string
  readonly dense?: boolean
  readonly footer?: JSX.Element
  readonly rowClass?: (row: T) => string
  readonly class?: string
}

const hideBelowClass: Record<DataTableHideBelow, string> = {
  sm: "hidden sm:table-cell",
  md: "hidden md:table-cell",
  lg: "hidden lg:table-cell",
  xl: "hidden xl:table-cell",
}

const mobileBreakpointClass: Record<DataTableBreakpoint, string> = {
  sm: "sm:hidden",
  md: "md:hidden",
}

const desktopBreakpointClass: Record<DataTableBreakpoint, string> = {
  sm: "hidden sm:block",
  md: "hidden md:block",
}

const alignCellClass: Record<NonNullable<DataTableColumn<never>["align"]>, string> = {
  left: "text-left",
  right: "text-right tabular-nums",
  center: "text-center",
}

/** Generic accessible data table with sorting, selection, cards on mobile, and German defaults. */
export function DataTable<T>(p: DataTableProps<T>) {
  const state = dataTableStateCreate<T>({ columns: () => p.columns, initialSort: p.initialSort })

  const sortedRows = createMemo(() => {
    const current = state.sort.get()
    if (!current) return [...p.rows]
    const column = p.columns.find((entry) => entry.id === current.columnId)
    if (!column?.sortValue) return [...p.rows]
    return dataTableSort(p.rows, column, current.direction)
  })

  const visibleKeys = createMemo(() => sortedRows().map((row) => p.rowKey(row)))

  const selectedSet = createMemo(() => new Set(p.selectedKeys ?? []))

  const selectable = () => p.selectable === true && p.onSelectedKeysChange !== undefined

  const allVisibleSelected = createMemo(() => {
    const keys = visibleKeys()
    if (keys.length === 0) return false
    return keys.every((key) => selectedSet().has(key))
  })

  const someVisibleSelected = createMemo(() => {
    const keys = visibleKeys()
    return keys.some((key) => selectedSet().has(key)) && !allVisibleSelected()
  })

  const selectedCount = createMemo(() => (p.selectedKeys ?? []).length)

  const selectionChange = (keys: string[]) => p.onSelectedKeysChange?.(keys)

  const selectAllToggle = () => {
    const keys = visibleKeys()
    if (allVisibleSelected()) selectionChange((p.selectedKeys ?? []).filter((key) => !keys.includes(key)))
    else selectionChange([...new Set([...(p.selectedKeys ?? []), ...keys])])
  }

  const rowSelectedToggle = (key: string, checked: boolean) => {
    const current = p.selectedKeys ?? []
    selectionChange(checked ? [...new Set([...current, key])] : current.filter((entry) => entry !== key))
  }

  const isActive = (row: T) =>
    p.activeRowKey !== undefined && p.activeRowKey !== null && p.activeRowKey === p.rowKey(row)

  const rowHeightClass = () => (p.dense ? "h-10" : "h-12")

  const stopSelection = (event: Event) => event.stopPropagation()

  return (
    <div class={classMerge("overflow-clip rounded-card border border-border-subtle bg-surface", p.class)}>
      <Show when={selectable() && selectedCount() > 0}>
        <div
          class="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-border-subtle bg-surface-muted px-4 py-2"
          role="region"
          aria-label="Auswahl-Aktionen"
        >
          <span class="text-sm font-medium text-content">
            {selectedCount()} {selectedCount() === 1 ? "ausgewählt" : "ausgewählt"}
          </span>
          <Show when={p.bulkActions}>{p.bulkActions?.([...(p.selectedKeys ?? [])])}</Show>
          <Button variant="ghost" size="sm" class="px-2 text-sm text-content-muted" onClick={() => selectionChange([])}>
            Auswahl aufheben
          </Button>
        </div>
      </Show>
      <div class={classMerge(desktopBreakpointClass[p.mobileBreakpoint ?? "md"])}>
        <div class="overflow-x-auto">
          <table class="w-full text-sm" aria-label={p.ariaLabel}>
            <thead>
              <tr
                class={classMerge(
                  "sticky border-b border-border-subtle bg-surface/95 backdrop-blur",
                  p.stickyHeaderClass ?? "top-0",
                )}
              >
                <Show when={selectable()}>
                  <th scope="col" class="w-10 px-4 py-2 text-left">
                    <Checkbox
                      id={`datatable-select-all-${p.ariaLabel}`}
                      checked={allVisibleSelected()}
                      onChange={selectAllToggle}
                    >
                      <span class="sr-only">Alle sichtbaren Zeilen auswählen</span>
                    </Checkbox>
                  </th>
                </Show>
                <For each={p.columns}>
                  {(column) => (
                    <th
                      scope="col"
                      aria-sort={column.sortValue ? state.sortAria(column.id) : undefined}
                      class={classMerge(
                        "px-4 py-2 text-xs font-medium normal-case tracking-normal text-content-muted",
                        alignCellClass[column.align ?? "left"],
                        column.hideBelow ? hideBelowClass[column.hideBelow] : undefined,
                        column.headerClass,
                        column.width,
                      )}
                    >
                      <Show
                        when={column.sortValue}
                        fallback={<span class="inline-flex items-center gap-1">{column.header}</span>}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          class={classMerge(
                            "-ml-2 inline-flex items-center gap-1 px-2 py-1 text-xs font-medium normal-case tracking-normal text-content-muted",
                            (column.align ?? "left") === "right" && "flex-row-reverse",
                            (column.align ?? "left") === "center" && "mx-auto",
                          )}
                          onClick={() => state.sortToggle(column)}
                          title={`Nach ${column.header} sortieren`}
                        >
                          {column.header}
                          <Icon
                            path={
                              state.sortDirection(column.id) === "asc"
                                ? mdiChevronUp
                                : state.sortDirection(column.id) === "desc"
                                  ? mdiChevronDown
                                  : mdiUnfoldMoreHorizontal
                            }
                            class="size-4 shrink-0"
                          />
                        </Button>
                      </Show>
                    </th>
                  )}
                </For>
              </tr>
            </thead>
            <tbody>
              <Show
                when={!p.loading}
                fallback={
                  <For each={Array.from({ length: p.skeletonRows ?? 6 }, (_, index) => index)}>
                    {() => (
                      <tr class={classMerge("border-b border-border-subtle last:border-b-0", rowHeightClass())}>
                        <Show when={selectable()}>
                          <td class="px-4 py-2">
                            <div class="size-4 animate-pulse rounded bg-surface-muted" />
                          </td>
                        </Show>
                        <For each={p.columns}>
                          {(column) => (
                            <td
                              class={classMerge(
                                "px-4 py-2",
                                column.hideBelow ? hideBelowClass[column.hideBelow] : undefined,
                              )}
                            >
                              <div class="h-4 animate-pulse rounded bg-surface-muted" />
                            </td>
                          )}
                        </For>
                      </tr>
                    )}
                  </For>
                }
              >
                <Show
                  when={sortedRows().length > 0}
                  fallback={
                    <tr>
                      <td
                        colSpan={p.columns.length + (selectable() ? 1 : 0)}
                        class="px-4 py-10 text-center text-sm text-content-muted"
                      >
                        {p.empty ?? (
                          <span class="inline-flex flex-col items-center gap-1">
                            <span>Keine Einträge</span>
                          </span>
                        )}
                      </td>
                    </tr>
                  }
                >
                  <For each={sortedRows()}>
                    {(row) => {
                      const key = p.rowKey(row)
                      const checked = () => selectedSet().has(key)
                      return (
                        <tr
                          tabindex={p.onRowClick ? 0 : undefined}
                          onClick={p.onRowClick ? () => p.onRowClick?.(row) : undefined}
                          onKeyDown={
                            p.onRowClick
                              ? (event) => {
                                  if (event.key === "Enter" || event.key === " ") {
                                    event.preventDefault()
                                    p.onRowClick?.(row)
                                  }
                                }
                              : undefined
                          }
                          class={classMerge(
                            "border-b border-border-subtle transition-colors last:border-b-0",
                            rowHeightClass(),
                            p.onRowClick &&
                              "cursor-pointer hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-ring",
                            isActive(row) && "bg-brand-soft/40 dark:bg-brand-soft/20",
                            p.rowClass?.(row),
                          )}
                        >
                          <Show when={selectable()}>
                            <td class="w-10 px-4 py-2" onClick={stopSelection} onKeyDown={stopSelection}>
                              <Checkbox
                                id={`datatable-select-${key}`}
                                checked={checked()}
                                onChange={(next) => rowSelectedToggle(key, next)}
                              >
                                <span class="sr-only">Zeile auswählen</span>
                              </Checkbox>
                            </td>
                          </Show>
                          <For each={p.columns}>
                            {(column) => (
                              <td
                                class={classMerge(
                                  "px-4 py-2 align-middle text-content",
                                  alignCellClass[column.align ?? "left"],
                                  column.hideBelow ? hideBelowClass[column.hideBelow] : undefined,
                                  column.cellClass,
                                  column.width,
                                )}
                              >
                                {column.cell(row)}
                              </td>
                            )}
                          </For>
                        </tr>
                      )
                    }}
                  </For>
                </Show>
              </Show>
            </tbody>
          </table>
        </div>
      </div>
      <div class={classMerge("w-full", mobileBreakpointClass[p.mobileBreakpoint ?? "md"])}>
        <Show
          when={!p.loading}
          fallback={
            <div class="flex flex-col gap-2 p-4" role="status" aria-label="Wird geladen">
              <For each={Array.from({ length: p.skeletonRows ?? 6 }, (_, index) => index)}>
                {() => <div class="h-20 animate-pulse rounded-control bg-surface-muted" />}
              </For>
            </div>
          }
        >
          <Show
            when={sortedRows().length > 0}
            fallback={
              <div class="px-4 py-10 text-center text-sm text-content-muted">
                {p.empty ?? <span>Keine Einträge</span>}
              </div>
            }
          >
            <ul class="flex flex-col gap-2 p-3" aria-label={p.ariaLabel}>
              <For each={sortedRows()}>
                {(row) => (
                  <li
                    class={classMerge(
                      "rounded-control border border-border-subtle bg-surface p-3",
                      p.onRowClick && "cursor-pointer active:bg-surface-muted",
                      isActive(row) && "border-brand ring-1 ring-brand",
                    )}
                    onClick={p.onRowClick ? () => p.onRowClick?.(row) : undefined}
                  >
                    <Show when={p.mobileCard} fallback={<DataTableDefaultCard row={row} columns={p.columns} />}>
                      {p.mobileCard?.(row)}
                    </Show>
                  </li>
                )}
              </For>
            </ul>
          </Show>
        </Show>
      </div>
      <Show when={p.footer}>
        <div class="border-t border-border-subtle bg-surface px-4 py-2">{p.footer}</div>
      </Show>
    </div>
  )
}

function DataTableDefaultCard<T>(p: { readonly row: T; readonly columns: readonly DataTableColumn<T>[] }) {
  const first = () => p.columns[0]
  const rest = () => p.columns.slice(1)
  return (
    <div class="flex flex-col gap-1">
      <Show when={first()}>
        <div class="text-sm font-semibold text-content">{first()?.cell(p.row)}</div>
      </Show>
      <dl class="flex flex-col gap-1">
        <For each={rest()}>
          {(column) => (
            <div class="flex items-baseline justify-between gap-3 text-sm">
              <dt class="shrink-0 text-xs text-content-muted">{column.header}</dt>
              <dd class={classMerge("min-w-0 text-right text-content", column.cellClass)}>{column.cell(p.row)}</dd>
            </div>
          )}
        </For>
      </dl>
    </div>
  )
}
