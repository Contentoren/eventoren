import { afterEach, beforeEach, expect, setSystemTime, test } from "bun:test"
import { ticketActivationCodeHoldKey } from "../src/ticketing/ticketActivationCodeHoldKey.ts"
import { ticketActivationCodeHoldMemoryStore } from "../src/ticketing/ticketActivationCodeHoldMemoryStore.ts"
import { ticketActivationCodeHoldStorageLoad } from "../src/ticketing/ticketActivationCodeHoldStorageLoad.ts"
import { ticketActivationCodeHoldStorageSave } from "../src/ticketing/ticketActivationCodeHoldStorageSave.ts"
import { ticketActivationCodeHoldStorageUpsert } from "../src/ticketing/ticketActivationCodeHoldStorageUpsert.ts"
import {
  ticketActivationCodeHoldTokenClear,
  ticketActivationCodeHoldTokenGet,
} from "../src/ticketing/ticketActivationCodeHoldTokenGet.ts"

class MemoryStorage implements Storage {
  private readonly values = new Map<string, string>()

  get length(): number {
    return this.values.size
  }

  clear(): void {
    this.values.clear()
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}

const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
  ticketActivationCodeHoldMemoryStore.clear()
})

afterEach(() => {
  setSystemTime()
  if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
  else Reflect.deleteProperty(globalThis, "localStorage")
  ticketActivationCodeHoldMemoryStore.clear()
})

const now = Date.now()

function holdTokenOf(context: { eventKey: string; tierKey: string; code: string }): string | undefined {
  const found = ticketActivationCodeHoldTokenGet(context)
  return found.success ? found.data : undefined
}

const holdRecord = {
  eventKey: "event-1",
  tierKey: "vip",
  code: "AB12CD34",
  holdToken: "hold-token-0123456789abcdef",
  expiresAt: now + 15 * 60 * 1000,
  savedAt: now,
}

test("hold storage stays separate from the 24h cart and reads back the exact context", () => {
  expect(ticketActivationCodeHoldStorageUpsert(holdRecord).success).toBe(true)
  expect(storage.getItem(ticketActivationCodeHoldKey)).not.toBeNull()

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toEqual([holdRecord])

  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: " ab12cd34 " })).toBe(holdRecord.holdToken)
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: "ZZZZ9999" })).toBeUndefined()
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "other", code: "AB12CD34" })).toBeUndefined()
  expect(holdTokenOf({ eventKey: "event-2", tierKey: "vip", code: "AB12CD34" })).toBeUndefined()
})

test("hold storage re-entry for the same context replaces instead of duplicating", () => {
  expect(ticketActivationCodeHoldStorageUpsert(holdRecord).success).toBe(true)
  expect(
    ticketActivationCodeHoldStorageUpsert({ ...holdRecord, holdToken: "hold-token-second-0123456789" }).success,
  ).toBe(true)

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toHaveLength(1)
  expect(loaded.data[0]?.holdToken).toBe("hold-token-second-0123456789")
})

test("hold storage keeps other contexts and clears one exact context", () => {
  const other = { ...holdRecord, eventKey: "event-2", holdToken: "hold-token-other-0123456789" }
  expect(ticketActivationCodeHoldStorageUpsert(holdRecord).success).toBe(true)
  expect(ticketActivationCodeHoldStorageUpsert(other).success).toBe(true)

  expect(ticketActivationCodeHoldTokenClear({ eventKey: " event-1 ", tierKey: "vip", code: "ab12cd34" }).success).toBe(
    true,
  )
  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toEqual([other])
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: "AB12CD34" })).toBeUndefined()
  expect(holdTokenOf({ eventKey: "event-2", tierKey: "vip", code: "AB12CD34" })).toBe(other.holdToken)
})

test("hold storage drops corrupt entries and treats a malformed store as failed", () => {
  storage.setItem(ticketActivationCodeHoldKey, JSON.stringify([{ ...holdRecord, holdToken: "short" }, holdRecord]))
  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toEqual([holdRecord])

  storage.setItem(ticketActivationCodeHoldKey, "{")
  expect(ticketActivationCodeHoldStorageLoad().success).toBe(false)
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: "AB12CD34" })).toBeUndefined()
})

test("a stored credential stays bound to its own event, tier and code context", () => {
  storage.setItem(
    ticketActivationCodeHoldKey,
    JSON.stringify([{ ...holdRecord, eventKey: "foreign-event", holdToken: "hold-token-foreign-0123456789" }]),
  )
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: "AB12CD34" })).toBeUndefined()
  expect(holdTokenOf({ eventKey: "foreign-event", tierKey: "vip", code: "AB12CD34" })).toBe(
    "hold-token-foreign-0123456789",
  )
  expect(holdTokenOf({ eventKey: "foreign-event", tierKey: "other", code: "AB12CD34" })).toBeUndefined()
})

test("a denied store keeps the credential in the same document so a repeat entry still owns the hold", () => {
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: () => {
        throw new Error("blocked")
      },
      setItem: () => {
        throw new Error("blocked")
      },
      removeItem: () => {
        throw new Error("blocked")
      },
    },
  })
  expect(ticketActivationCodeHoldStorageUpsert(holdRecord).success).toBe(false)
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: "AB12CD34" })).toBe(holdRecord.holdToken)
  expect(holdTokenOf({ eventKey: "event-2", tierKey: "vip", code: "AB12CD34" })).toBeUndefined()
  expect(ticketActivationCodeHoldTokenClear({ eventKey: "event-1", tierKey: "vip", code: "AB12CD34" }).success).toBe(
    true,
  )
  expect(holdTokenOf({ eventKey: "event-1", tierKey: "vip", code: "AB12CD34" })).toBeUndefined()
  expect(ticketActivationCodeHoldStorageSave([]).success).toBe(false)
})

test("a record past its local 15 minute mirror leaves the local store without releasing anything on the server", () => {
  const expired = {
    eventKey: "event-3",
    tierKey: "vip",
    code: "EXPIRED1",
    holdToken: "hold-token-expired-0123456789",
    expiresAt: now - 10 * 60 * 1000,
    savedAt: now - 20 * 60 * 1000,
  }
  expect(ticketActivationCodeHoldStorageUpsert(expired).success).toBe(true)

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data).toEqual([])
  expect(storage.getItem(ticketActivationCodeHoldKey)).toBeNull()
  expect(holdTokenOf({ eventKey: "event-3", tierKey: "vip", code: "EXPIRED1" })).toBeUndefined()
})

test("a repeated entry keeps the original save moment so the deadline is never refreshed", () => {
  const first = { ...holdRecord, savedAt: now - 60 * 1000 }
  expect(ticketActivationCodeHoldStorageUpsert(first).success).toBe(true)
  expect(ticketActivationCodeHoldStorageUpsert({ ...first, savedAt: now }).success).toBe(true)

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data[0]?.savedAt).toBe(now - 60 * 1000)
})

test("the mirrored hold window ends exactly 15 minutes after the first successful reservation", () => {
  const base = Date.parse("2026-10-25T10:00:00.000Z")
  setSystemTime(new Date(base))
  const record = {
    eventKey: "event-4",
    tierKey: "vip",
    code: "MIRROR01",
    holdToken: "hold-token-mirror-0123456789",
    expiresAt: base + 15 * 60 * 1000,
    savedAt: base,
  }
  expect(ticketActivationCodeHoldStorageUpsert(record).success).toBe(true)

  setSystemTime(new Date(base + 14 * 60 * 1000 + 59 * 1000))
  const live = ticketActivationCodeHoldStorageLoad()
  expect(live.success).toBe(true)
  if (!live.success) return
  expect(live.data).toHaveLength(1)

  setSystemTime(new Date(base + 15 * 60 * 1000))
  const expired = ticketActivationCodeHoldStorageLoad()
  expect(expired.success).toBe(true)
  if (!expired.success) return
  expect(expired.data).toEqual([])
  expect(storage.getItem(ticketActivationCodeHoldKey)).toBeNull()
})

test("a repeated entry after 10 minutes keeps the first save moment and does not extend the mirrored window", () => {
  const base = Date.parse("2026-10-25T11:00:00.000Z")
  setSystemTime(new Date(base))
  const record = {
    eventKey: "event-5",
    tierKey: "vip",
    code: "REPEAT01",
    holdToken: "hold-token-repeat-0123456789",
    expiresAt: base + 15 * 60 * 1000,
    savedAt: base,
  }
  expect(ticketActivationCodeHoldStorageUpsert(record).success).toBe(true)

  setSystemTime(new Date(base + 10 * 60 * 1000))
  expect(ticketActivationCodeHoldStorageUpsert({ ...record, savedAt: base + 10 * 60 * 1000 }).success).toBe(true)

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data[0]?.savedAt).toBe(base)

  setSystemTime(new Date(base + 15 * 60 * 1000))
  const expired = ticketActivationCodeHoldStorageLoad()
  expect(expired.success).toBe(true)
  if (!expired.success) return
  expect(expired.data).toEqual([])
})

test("a new server window with a new server deadline starts a new mirrored window", () => {
  const base = Date.parse("2026-10-25T12:00:00.000Z")
  setSystemTime(new Date(base))
  const record = {
    eventKey: "event-6",
    tierKey: "vip",
    code: "RENEW001",
    holdToken: "hold-token-renew-0123456789",
    expiresAt: base + 15 * 60 * 1000,
    savedAt: base,
  }
  expect(ticketActivationCodeHoldStorageUpsert(record).success).toBe(true)

  const next = { ...record, expiresAt: base + 60_000 + 15 * 60 * 1000, savedAt: base + 60_000 }
  setSystemTime(new Date(base + 60_000))
  expect(ticketActivationCodeHoldStorageUpsert(next).success).toBe(true)

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data[0]?.savedAt).toBe(base + 60_000)
  expect(loaded.data[0]?.expiresAt).toBe(base + 60_000 + 15 * 60 * 1000)
})

test("a new credential for the same code starts a new mirrored window", () => {
  const base = Date.parse("2026-10-25T13:00:00.000Z")
  setSystemTime(new Date(base))
  const record = {
    eventKey: "event-7",
    tierKey: "vip",
    code: "TOKNEW01",
    holdToken: "hold-token-first-0123456789",
    expiresAt: base + 15 * 60 * 1000,
    savedAt: base,
  }
  expect(ticketActivationCodeHoldStorageUpsert(record).success).toBe(true)

  setSystemTime(new Date(base + 60_000))
  expect(
    ticketActivationCodeHoldStorageUpsert({
      ...record,
      holdToken: "hold-token-second-0123456789",
      savedAt: base + 60_000,
    }).success,
  ).toBe(true)

  const loaded = ticketActivationCodeHoldStorageLoad()
  expect(loaded.success).toBe(true)
  if (!loaded.success) return
  expect(loaded.data[0]?.savedAt).toBe(base + 60_000)
  expect(loaded.data[0]?.holdToken).toBe("hold-token-second-0123456789")
})
