import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminTicketOrdersColumnWidthsGridTemplate } from "./adminTicketOrdersColumnWidthsGridTemplate.ts"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"
import { adminTicketOrdersColumnWidthsStateCreate } from "./adminTicketOrdersColumnWidthsStateCreate.ts"
import { adminTicketOrdersColumnWidthsStorageKey } from "./adminTicketOrdersColumnWidthsStorageKey.ts"
import { adminTicketOrdersColumnWidthsStorageLoad } from "./adminTicketOrdersColumnWidthsStorageLoad.ts"

type Listener = (event: { readonly clientX: number }) => void

function memoryStorage() {
  const entries = new Map<string, string>()
  return {
    getItem: (key: string) => (entries.has(key) ? (entries.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      entries.set(key, value)
    },
    removeItem: (key: string) => {
      entries.delete(key)
    },
    entries,
  }
}

function dragTarget() {
  const listeners = new Map<string, Set<Listener>>()
  return {
    addEventListener: (type: string, listener: Listener) => {
      const set = listeners.get(type) ?? new Set<Listener>()
      set.add(listener)
      listeners.set(type, set)
    },
    removeEventListener: (type: string, listener: Listener) => {
      listeners.get(type)?.delete(listener)
    },
    emit: (type: string, clientX: number) => {
      for (const listener of listeners.get(type) ?? []) listener({ clientX })
    },
  }
}

const measured = [220.4, 180.6, 150, 120, 120, 90, 140]

test("empty storage starts with the default fraction grid", () => {
  createRoot((dispose) => {
    const columns = adminTicketOrdersColumnWidthsStateCreate({ storage: memoryStorage() })
    expect(columns.columnWidths()).toBeNull()
    expect(columns.hasCustomWidths()).toBe(false)
    expect(columns.gridTemplate()).toBe(adminTicketOrdersColumnWidthsGridTemplate(null))
    dispose()
  })
})

test("pointer drag measures all columns first and persists the resized widths", () => {
  createRoot((dispose) => {
    const storage = memoryStorage()
    const target = dragTarget()
    const columns = adminTicketOrdersColumnWidthsStateCreate({ dragTarget: target, storage })

    columns.columnDragStart(0, 100, measured)
    expect(columns.columnWidths()).toEqual([220, 181, 150, 120, 120, 90, 140])

    target.emit("pointermove", 130)
    expect(columns.columnWidths()?.[0]).toBe(250)
    expect(columns.hasCustomWidths()).toBe(true)
    expect(adminTicketOrdersColumnWidthsStorageLoad(storage)?.[0]).toBe(250)

    target.emit("pointerup", 130)
    dispose()
  })
})

test("arrow keys measure first and move the focused column by one step", () => {
  createRoot((dispose) => {
    const columns = adminTicketOrdersColumnWidthsStateCreate({ storage: memoryStorage() })
    columns.columnKeyResize(1, "ArrowRight", measured)
    expect(columns.columnWidths()).toEqual([220, 197, 150, 120, 120, 90, 140])
    columns.columnKeyResize(1, "ArrowLeft", measured)
    expect(columns.columnWidths()?.[1]).toBe(181)
    columns.columnKeyResize(1, "Enter", measured)
    expect(columns.columnWidths()?.[1]).toBe(181)
    dispose()
  })
})

test("invalid measurements keep the default grid instead of starting a resize", () => {
  createRoot((dispose) => {
    const columns = adminTicketOrdersColumnWidthsStateCreate({ dragTarget: dragTarget(), storage: memoryStorage() })
    columns.columnDragStart(0, 100, [220, 180, 150])
    expect(columns.columnWidths()).toBeNull()
    columns.columnKeyResize(0, "ArrowRight", [220, 180, 150])
    expect(columns.columnWidths()).toBeNull()
    dispose()
  })
})

test("header measurement reads every column width for the first drag", () => {
  createRoot((dispose) => {
    const columns = adminTicketOrdersColumnWidthsStateCreate({ storage: memoryStorage() })
    const element = {
      children: measured.map((width) => ({
        getBoundingClientRect: () => ({ width }),
      })),
    } as unknown as HTMLElement
    expect(columns.columnMeasure(element)).toEqual([...measured])
    expect(columns.columnMeasure(undefined)).toEqual([])
    dispose()
  })
})

test("reset clears the stored widths and restores the default grid", () => {
  createRoot((dispose) => {
    const storage = memoryStorage()
    const columns = adminTicketOrdersColumnWidthsStateCreate({ storage: memoryStorage() })
    columns.columnKeyResize(0, "ArrowRight", measured)
    expect(columns.hasCustomWidths()).toBe(true)

    const stored: AdminTicketOrdersColumnWidths = [220, 181, 150, 120, 120, 90, 140]
    storage.entries.set(adminTicketOrdersColumnWidthsStorageKey, JSON.stringify(stored))
    const reloaded = adminTicketOrdersColumnWidthsStateCreate({ storage })
    expect(reloaded.columnWidths()).toEqual([...stored])

    reloaded.columnReset()
    expect(reloaded.columnWidths()).toBeNull()
    expect(reloaded.gridTemplate()).toBe(adminTicketOrdersColumnWidthsGridTemplate(null))
    expect(storage.entries.has(adminTicketOrdersColumnWidthsStorageKey)).toBe(false)
    dispose()
  })
})
