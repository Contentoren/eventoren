import { expect, test } from "bun:test"
import type { AdminTicketOrdersColumnWidths } from "./adminTicketOrdersColumnWidthsSchema.ts"
import { adminTicketOrdersColumnWidthsStorageKey } from "./adminTicketOrdersColumnWidthsStorageKey.ts"
import { adminTicketOrdersColumnWidthsStorageLoad } from "./adminTicketOrdersColumnWidthsStorageLoad.ts"
import { adminTicketOrdersColumnWidthsStorageReset } from "./adminTicketOrdersColumnWidthsStorageReset.ts"
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

test("reset removes the stored widths and restores the default grid", () => {
  const storage = memoryStorage()
  adminTicketOrdersColumnWidthsStorageSave(valid, storage)
  expect(storage.entries.has(adminTicketOrdersColumnWidthsStorageKey)).toBe(true)

  adminTicketOrdersColumnWidthsStorageReset(storage)

  expect(storage.entries.has(adminTicketOrdersColumnWidthsStorageKey)).toBe(false)
  expect(adminTicketOrdersColumnWidthsStorageLoad(storage)).toBeNull()
})

test("reset without stored widths stays silent", () => {
  expect(() => adminTicketOrdersColumnWidthsStorageReset(memoryStorage())).not.toThrow()
})

test("reset tolerates failing storage", () => {
  const failing = {
    removeItem: (_key: string): void => {
      throw new Error("denied")
    },
  }
  expect(() => adminTicketOrdersColumnWidthsStorageReset(failing)).not.toThrow()
})
