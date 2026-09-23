import { afterEach, beforeEach, expect, test } from "bun:test"
import { adminListViewStorageKey } from "../src/viewPreference/adminListViewStorageKey.ts"
import { adminListViewStorageLoad } from "../src/viewPreference/adminListViewStorageLoad.ts"
import { adminListViewStorageSave } from "../src/viewPreference/adminListViewStorageSave.ts"

class MemoryStorage implements Storage {
  private values = new Map<string, string>()

  get length() {
    return this.values.size
  }

  clear() {
    this.values.clear()
  }

  getItem(key: string) {
    return this.values.get(key) ?? null
  }

  key(index: number) {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string) {
    this.values.delete(key)
  }

  setItem(key: string, value: string) {
    this.values.set(key, value)
  }
}

const previousLocalStorage = globalThis.localStorage
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
})

afterEach(() => {
  if (previousLocalStorage === undefined) {
    delete (globalThis as { localStorage?: Storage }).localStorage
    return
  }
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage })
})

test("adminListViewStorageLoad defaults to list when no preference is stored", () => {
  expect(adminListViewStorageLoad()).toBe("list")
})

test("adminListViewStorageLoad falls back to list for corrupt stored preferences", () => {
  storage.setItem(adminListViewStorageKey, "grid")

  expect(adminListViewStorageLoad()).toBe("list")
})

test("adminListViewStorageLoad returns a valid stored preference", () => {
  storage.setItem(adminListViewStorageKey, "tiles")

  expect(adminListViewStorageLoad()).toBe("tiles")
})

test("adminListViewStorageSave persists a preference for subsequent shared loads", () => {
  adminListViewStorageSave("tiles")

  expect(storage.getItem(adminListViewStorageKey)).toBe("tiles")
  expect(adminListViewStorageLoad()).toBe("tiles")
})

test("adminListViewStorageLoad and adminListViewStorageSave tolerate storage failures", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem() {
        throw new Error("storage unavailable")
      },
      setItem() {
        throw new Error("storage unavailable")
      },
    },
  })

  expect(adminListViewStorageLoad()).toBe("list")
  expect(() => adminListViewStorageSave("tiles")).not.toThrow()
})
