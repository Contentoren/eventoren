import { expect, test } from "bun:test"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"
import { adminTicketOrdersColumnWidthsStorageKey } from "./adminTicketOrdersColumnWidthsStorageKey.ts"
import { adminTicketOrdersColumnWidthsStorageLoad } from "./adminTicketOrdersColumnWidthsStorageLoad.ts"
import { adminTicketOrdersColumnWidthsStorageSave } from "./adminTicketOrdersColumnWidthsStorageSave.ts"

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

const valid: AdminTicketOrdersColumnWidths = [220, 180, 150, 120, 120, 90, 140]

test("empty storage loads no custom widths", () => {
  expect(adminTicketOrdersColumnWidthsStorageLoad(memoryStorage())).toBeNull()
})

test("saved widths survive a load roundtrip", () => {
  const storage = memoryStorage()
  adminTicketOrdersColumnWidthsStorageSave(valid, storage)
  expect(adminTicketOrdersColumnWidthsStorageLoad(storage)).toEqual([...valid])
})

test("invalid stored values fall back to no custom widths", () => {
  const raws = [
    "{not-json",
    "[220,180,150]",
    "[220,180,150,120,120,90,140,10]",
    "[220,180,150,120,120,90,-5]",
    "[220,180,150,120,120,90,null]",
    '["220","180","150","120","120","90","140"]',
    "[220,180,150,120,120,10,140]",
    '{"widths":[220,180,150,120,120,90,140]}',
  ]
  for (const raw of raws) {
    const storage = memoryStorage()
    storage.entries.set(adminTicketOrdersColumnWidthsStorageKey, raw)
    expect(adminTicketOrdersColumnWidthsStorageLoad(storage)).toBeNull()
  }
})

test("unreadable storage loads no custom widths instead of throwing", () => {
  const failing = {
    getItem: (_key: string): string | null => {
      throw new Error("denied")
    },
  }
  expect(adminTicketOrdersColumnWidthsStorageLoad(failing)).toBeNull()
})

test("unwritable storage keeps saving silent", () => {
  const failing = {
    setItem: (_key: string, _value: string): void => {
      throw new Error("denied")
    },
  }
  expect(() => adminTicketOrdersColumnWidthsStorageSave(valid, failing)).not.toThrow()
})
