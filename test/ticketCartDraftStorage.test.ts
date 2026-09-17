import { afterEach, beforeEach, expect, test } from "bun:test"
import type { TicketCartDraft } from "../src/ticketing/TicketCartDraft.ts"
import { ticketCartDraftKey } from "../src/ticketing/ticketCartDraftKey.ts"
import { ticketCartDraftLoad } from "../src/ticketing/ticketCartDraftLoad.ts"
import { ticketCartDraftMaxAgeMs } from "../src/ticketing/ticketCartDraftMaxAgeMs.ts"
import { ticketCartDraftSave } from "../src/ticketing/ticketCartDraftSave.ts"

class MemoryStorage implements Storage {
  private map = new Map<string, string>()

  get length(): number {
    return this.map.size
  }

  clear(): void {
    this.map.clear()
  }

  getItem(key: string): string | null {
    return this.map.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.map.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.map.delete(key)
  }

  setItem(key: string, value: string): void {
    this.map.set(key, value)
  }
}

const previousLocalStorage = globalThis.localStorage
let storage: MemoryStorage

beforeEach(() => {
  storage = new MemoryStorage()
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: storage })
})

afterEach(() => {
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage })
})

const sampleDraft: TicketCartDraft = [
  {
    eventId: "event-1",
    lines: [{ tierId: "standard", quantity: 2 }],
  },
]

test("loads empty draft when nothing is stored", () => {
  expect(ticketCartDraftLoad()).toEqual([])
})

test("saves and loads cart draft within 24 hours", () => {
  const now = 1_000_000_000
  ticketCartDraftSave(sampleDraft, now)

  const loaded = ticketCartDraftLoad(now + 10_000)
  expect(loaded).toEqual(sampleDraft)
})

test("expires and clears cart draft after 24 hours", () => {
  const now = 1_000_000_000
  ticketCartDraftSave(sampleDraft, now)

  const loaded = ticketCartDraftLoad(now + ticketCartDraftMaxAgeMs + 1)
  expect(loaded).toEqual([])
  expect(storage.getItem(ticketCartDraftKey)).toBeNull()
})

test("loads valid legacy cart format without savedAt for backwards compatibility", () => {
  storage.setItem(ticketCartDraftKey, JSON.stringify({ version: 2, carts: sampleDraft }))
  expect(ticketCartDraftLoad()).toEqual(sampleDraft)
})
