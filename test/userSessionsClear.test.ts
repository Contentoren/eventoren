import { expect, test } from "bun:test"
import { userSessionSignal } from "../src/auth/ui/signals/userSessionSignal.ts"
import { userSessionsClear } from "../src/auth/ui/signals/userSessionsClear.ts"
import { userSessionsSignal } from "../src/auth/ui/signals/userSessionsSignal.ts"

test("clears the current and remembered browser sessions", () => {
  const previousSessionStorage = globalThis.sessionStorage
  const previousLocalStorage = globalThis.localStorage
  const sessionStorage = new MemoryStorage()
  const localStorage = new MemoryStorage()
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage })
  Object.defineProperty(globalThis, "localStorage", { configurable: true, value: localStorage })

  try {
    sessionStorage.setItem("userSession", "current")
    localStorage.setItem("userSessions", "remembered")
    userSessionsClear()

    expect(userSessionSignal.get()).toBeNull()
    expect(userSessionsSignal.get()).toEqual([])
    expect(sessionStorage.getItem("userSession")).toBeNull()
    expect(localStorage.getItem("userSessions")).toBe("[]")
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previousSessionStorage })
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage })
  }
})

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
    return [...this.values.keys()][index] ?? null
  }

  removeItem(key: string): void {
    this.values.delete(key)
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value)
  }
}
