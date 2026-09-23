import { describe, expect, it } from "bun:test"
import { eventorenSsoAttemptRecord } from "../src/auth/model/eventorenSsoAttemptRecord.ts"
import { eventorenSsoAttemptsExhaust } from "../src/auth/model/eventorenSsoAttemptsExhaust.ts"
import { eventorenSsoAttemptsRead } from "../src/auth/model/eventorenSsoAttemptsRead.ts"
import { eventorenSsoAttemptsReset } from "../src/auth/model/eventorenSsoAttemptsReset.ts"
import { eventorenSsoPreferenceRead } from "../src/auth/model/eventorenSsoPreferenceRead.ts"
import { eventorenSsoPreferenceWrite } from "../src/auth/model/eventorenSsoPreferenceWrite.ts"
import { eventorenSsoReturnToResolve } from "../src/auth/model/eventorenSsoReturnToResolve.ts"
import { eventorenSsoStorageKeys } from "../src/auth/model/eventorenSsoStorageKeys.ts"
import { eventorenSsoPageStateCreate } from "../src/auth/ui/eventorenSsoPageStateCreate.ts"

class MemoryStorage implements Storage {
  private items = new Map<string, string>()

  get length(): number {
    return this.items.size
  }

  clear(): void {
    this.items.clear()
  }

  getItem(key: string): string | null {
    return this.items.get(key) ?? null
  }

  key(index: number): string | null {
    return Array.from(this.items.keys())[index] ?? null
  }

  removeItem(key: string): void {
    this.items.delete(key)
  }

  setItem(key: string, value: string): void {
    this.items.set(key, value)
  }
}

describe("eventoren SSO state and semantics", () => {
  it("defaults preference to false when storage is empty or invalid", () => {
    const storage = new MemoryStorage()
    expect(eventorenSsoPreferenceRead(storage)).toBe(false)

    storage.setItem(eventorenSsoStorageKeys.preference, "not-json")
    expect(eventorenSsoPreferenceRead(storage)).toBe(false)

    storage.setItem(eventorenSsoStorageKeys.preference, JSON.stringify("unexpected-string"))
    expect(eventorenSsoPreferenceRead(storage)).toBe(false)
  })

  it("persists preference as JSON boolean and resets attempt budget", () => {
    const storage = new MemoryStorage()
    storage.setItem(eventorenSsoStorageKeys.attempts, "2")

    const result = eventorenSsoPreferenceWrite(true, storage)
    expect(result.success).toBe(true)
    expect(storage.getItem(eventorenSsoStorageKeys.preference)).toBe("true")
    expect(eventorenSsoPreferenceRead(storage)).toBe(true)
    expect(storage.getItem(eventorenSsoStorageKeys.attempts)).toBeNull()
  })

  it("reports attempt reset failures to the preference caller", () => {
    const storage = {
      length: 0,
      clear: () => {},
      getItem: () => null,
      key: () => null,
      removeItem: () => {
        throw new Error("SecurityError")
      },
      setItem: () => {},
    } as unknown as Storage

    const result = eventorenSsoPreferenceWrite(true, storage)

    expect(result.success).toBe(false)
    if (!result.success) expect(result.op).toBe("eventorenSsoAttemptsReset")
  })

  it("limits automatic sign-in attempts to max three and pauses afterwards", () => {
    const storage = new MemoryStorage()

    const attempt1 = eventorenSsoAttemptRecord(storage)
    expect(attempt1.success).toBe(true)
    if (attempt1.success) {
      expect(attempt1.data.allowed).toBe(true)
      expect(attempt1.data.attempts).toBe(1)
    }

    const attempt2 = eventorenSsoAttemptRecord(storage)
    expect(attempt2.success).toBe(true)
    if (attempt2.success) {
      expect(attempt2.data.allowed).toBe(true)
      expect(attempt2.data.attempts).toBe(2)
    }

    const attempt3 = eventorenSsoAttemptRecord(storage)
    expect(attempt3.success).toBe(true)
    if (attempt3.success) {
      expect(attempt3.data.allowed).toBe(true)
      expect(attempt3.data.attempts).toBe(3)
    }

    const attempt4 = eventorenSsoAttemptRecord(storage)
    expect(attempt4.success).toBe(true)
    if (attempt4.success) {
      expect(attempt4.data.allowed).toBe(false)
      expect(attempt4.data.attempts).toBe(3)
    }
  })

  it("exhausts attempts on deliberate logout", () => {
    const storage = new MemoryStorage()
    const exhaustResult = eventorenSsoAttemptsExhaust(storage)
    expect(exhaustResult.success).toBe(true)
    expect(eventorenSsoAttemptsRead(storage)).toBe(3)

    const nextAttempt = eventorenSsoAttemptRecord(storage)
    expect(nextAttempt.success).toBe(true)
    if (nextAttempt.success) {
      expect(nextAttempt.data.allowed).toBe(false)
    }
  })

  it("resets attempts counter correctly", () => {
    const storage = new MemoryStorage()
    eventorenSsoAttemptsExhaust(storage)
    expect(eventorenSsoAttemptsRead(storage)).toBe(3)

    eventorenSsoAttemptsReset(storage)
    expect(eventorenSsoAttemptsRead(storage)).toBe(0)
  })

  it("safely resolves return destinations without /sso loops", () => {
    expect(eventorenSsoReturnToResolve(undefined)).toBe("/")
    expect(eventorenSsoReturnToResolve("")).toBe("/")
    expect(eventorenSsoReturnToResolve("/sso")).toBe("/")
    expect(eventorenSsoReturnToResolve("/sso?returnTo=/admin")).toBe("/")
    expect(eventorenSsoReturnToResolve("/sso/subpath")).toBe("/")
    expect(eventorenSsoReturnToResolve("https://malicious.example.com")).toBe("/")
    expect(eventorenSsoReturnToResolve("//malicious.example.com")).toBe("/")
    expect(eventorenSsoReturnToResolve("/admin")).toBe("/admin")
    expect(eventorenSsoReturnToResolve("/bestellungen?page=1#details")).toBe("/bestellungen?page=1#details")
  })

  it("triggers Zitadel navigation with the resolved return destination", () => {
    const previousWindow = globalThis.window
    let assignedHref = ""
    Object.defineProperty(globalThis, "window", {
      configurable: true,
      value: { location: { assign: (href: string) => (assignedHref = href) } },
    })

    try {
      const state = eventorenSsoPageStateCreate({ returnTo: () => "/admin?tab=members#pending" })

      expect(state.loginDestination()).toBe("/login/zitadel?returnTo=%2Fadmin%3Ftab%3Dmembers%23pending")
      state.loginClick()

      expect(assignedHref).toBe("/login/zitadel?returnTo=%2Fadmin%3Ftab%3Dmembers%23pending")
      expect(state.isPending()).toBe(true)
    } finally {
      if (previousWindow === undefined) delete (globalThis as { window?: Window }).window
      else Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
    }
  })

  it("gracefully handles storage failures without throwing", () => {
    const throwingStorage = {
      length: 0,
      clear: () => {},
      getItem: () => {
        throw new Error("QuotaExceededError")
      },
      key: () => null,
      removeItem: () => {
        throw new Error("SecurityError")
      },
      setItem: () => {
        throw new Error("QuotaExceededError")
      },
    } as unknown as Storage

    expect(eventorenSsoPreferenceRead(throwingStorage)).toBe(false)
    expect(eventorenSsoAttemptsRead(throwingStorage)).toBe(0)

    const writeResult = eventorenSsoPreferenceWrite(true, throwingStorage)
    expect(writeResult.success).toBe(false)

    const recordResult = eventorenSsoAttemptRecord(throwingStorage)
    expect(recordResult.success).toBe(false)
  })
})
