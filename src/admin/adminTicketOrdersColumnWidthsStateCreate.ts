import { onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { adminTicketOrdersColumnWidthsDragCreate } from "./adminTicketOrdersColumnWidthsDragCreate.ts"
import { adminTicketOrdersColumnWidthsGridTemplate } from "./adminTicketOrdersColumnWidthsGridTemplate.ts"
import { adminTicketOrdersColumnWidthsMeasuredToPx } from "./adminTicketOrdersColumnWidthsMeasuredToPx.ts"
import { adminTicketOrdersColumnWidthsResize } from "./adminTicketOrdersColumnWidthsResize.ts"
import { adminTicketOrdersColumnWidthsResizeByKey } from "./adminTicketOrdersColumnWidthsResizeByKey.ts"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"
import { adminTicketOrdersColumnWidthsStorageLoad } from "./adminTicketOrdersColumnWidthsStorageLoad.ts"
import { adminTicketOrdersColumnWidthsStorageReset } from "./adminTicketOrdersColumnWidthsStorageReset.ts"
import { adminTicketOrdersColumnWidthsStorageSave } from "./adminTicketOrdersColumnWidthsStorageSave.ts"

export function adminTicketOrdersColumnWidthsStateCreate(options?: {
  readonly storage?: Pick<Storage, "getItem" | "setItem" | "removeItem">
  readonly dragTarget?: Parameters<typeof adminTicketOrdersColumnWidthsDragCreate>[0]["target"]
}) {
  const storage = options?.storage
  const widths = createSignalObject<AdminTicketOrdersColumnWidths | null>(
    adminTicketOrdersColumnWidthsStorageLoad(storage),
  )
  let activeCancel: (() => void) | undefined

  onCleanup(() => {
    activeCancel?.()
  })

  const persist = (next: AdminTicketOrdersColumnWidths): void => {
    adminTicketOrdersColumnWidthsStorageSave(next, storage)
  }

  const ensureFromMeasured = (measured: readonly number[]): AdminTicketOrdersColumnWidths | null => {
    const current = widths.get()
    if (current) return current
    const px = adminTicketOrdersColumnWidthsMeasuredToPx(measured)
    if (!px) return null
    widths.set(px)
    persist(px)
    return px
  }

  const columnDragStart = (index: number, startX: number, measured: readonly number[]): void => {
    const base = ensureFromMeasured(measured)
    if (!base) return
    activeCancel?.()
    const drag = adminTicketOrdersColumnWidthsDragCreate({
      startX,
      target: options?.dragTarget,
      onDelta: (deltaX) => {
        const next = adminTicketOrdersColumnWidthsResize(base, index, deltaX)
        if (next === base) return
        widths.set(next)
        persist(next)
      },
      onDone: () => {
        activeCancel = undefined
      },
    })
    activeCancel = drag?.cancel
  }

  const columnKeyResize = (index: number, key: string, measured: readonly number[]): void => {
    const base = ensureFromMeasured(measured)
    if (!base) return
    const next = adminTicketOrdersColumnWidthsResizeByKey(base, index, key)
    if (next === base) return
    widths.set(next)
    persist(next)
  }

  const columnMeasure = (element: HTMLElement | undefined): readonly number[] => {
    if (!element) return []
    return Array.from(element.children).map((child) => (child as HTMLElement).getBoundingClientRect().width)
  }

  const columnReset = (): void => {
    widths.set(null)
    adminTicketOrdersColumnWidthsStorageReset(storage)
  }

  const columnWidths = (): AdminTicketOrdersColumnWidths | null => widths.get()

  const gridTemplate = (): string => adminTicketOrdersColumnWidthsGridTemplate(widths.get())

  const hasCustomWidths = (): boolean => widths.get() !== null

  return { columnDragStart, columnKeyResize, columnMeasure, columnReset, columnWidths, gridTemplate, hasCustomWidths }
}
