import { expect, test } from "bun:test"
import { userSessionBrowserRestore } from "../src/auth/ui/signals/userSessionBrowserRestore.ts"
import { userSessionSignal } from "../src/auth/ui/signals/userSessionSignal.ts"

test("clears an expired browser session instead of restoring its token", () => {
  const previousSessionStorage = globalThis.sessionStorage
  const sessionStorage = new MemoryStorage()
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage })

  try {
    sessionStorage.setItem("userSession", JSON.stringify(sessionCreate(new Date(Date.now() - 1_000))))
    userSessionBrowserRestore()

    expect(userSessionSignal.get()).toBeNull()
    expect(sessionStorage.getItem("userSession")).toBeNull()
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previousSessionStorage })
  }
})

test("keeps an absent browser session anonymous", () => {
  const previousSessionStorage = globalThis.sessionStorage
  const sessionStorage = new MemoryStorage()
  Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: sessionStorage })

  try {
    userSessionSignal.set(null)
    userSessionBrowserRestore()

    expect(userSessionSignal.get()).toBeNull()
    expect(sessionStorage.getItem("userSession")).toBeNull()
  } finally {
    Object.defineProperty(globalThis, "sessionStorage", { configurable: true, value: previousSessionStorage })
  }
})

function sessionCreate(expiresAt: Date) {
  const now = new Date().toISOString()
  return {
    token: "expired-token",
    profile: { userId: "user-1", name: "Ada", role: "admin", createdAt: now, updatedAt: now },
    hasPw: false,
    signedInMethod: "zitadel",
    signedInAt: now,
    expiresAt: expiresAt.toISOString(),
  }
}

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
