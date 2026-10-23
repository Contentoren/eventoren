import { describe, expect, mock, test } from "bun:test"
import { veranstalterOnboardingDraftCacheCreate } from "./veranstalterOnboardingDraftCacheCreate.ts"
import type { VeranstalterOnboardingDraft } from "./veranstalterOnboardingDraftSchema.ts"

const solidJsClientPath = "solid-js/dist/solid.js"
type SolidJsModule = typeof import("solid-js")
const solidJsClient = (await import(solidJsClientPath)) as unknown as SolidJsModule
mock.module("solid-js", () => solidJsClient)
const { createRoot } = solidJsClient
const { veranstalterOnboardingPageStateCreate } = await import("./veranstalterOnboardingPageStateCreate.ts")
mock.restore()

const flushEffects = () => new Promise<void>((resolve) => setTimeout(resolve, 0))
const flushIdleWrite = () => new Promise<void>((resolve) => setTimeout(resolve, 600))

function validDraft(): VeranstalterOnboardingDraft {
  return {
    name: "Kulturhaus Lindenhof",
    slug: "kulturhaus-lindenhof",
    kind: "schule",
    contactEmail: "hallo@example.org",
    contactPhone: "",
    imprint: "",
    iban: "",
    bankHolder: "",
    contractParty: {
      legalName: "Kulturhaus Lindenhof e. V.",
      representativeName: "Max Mustermann",
      streetAddress: "Beispielstraße 1",
      postalCode: "10115",
      city: "Berlin",
      countryCode: "DE",
      email: "hallo@example.org",
      customerType: "business",
    },
    feePayer: "kaeufer",
  }
}

describe("veranstalterOnboardingDraftCacheCreate loads and saves technical fields only", () => {
  test("roundtrips technical fields per user without consent booleans", () => {
    const cache = veranstalterOnboardingDraftCacheCreate(undefined, "user-1")
    expect(cache.load()).toBeNull()
    cache.saveNow(validDraft())
    expect(cache.load()).toEqual(validDraft())
    cache.clear()
    expect(cache.load()).toBeNull()
  })

  test("rejects corrupt payloads instead of restoring partial input", () => {
    const store = {
      data: new Map<string, string>(),
      getItem(key: string) {
        return this.data.get(key) ?? null
      },
      setItem(key: string, value: string) {
        this.data.set(key, value)
      },
      removeItem(key: string) {
        this.data.delete(key)
      },
    }
    const cache = veranstalterOnboardingDraftCacheCreate(store, "user-1")
    const key = "eventoren.veranstalterOnboardingDraft.v2:user-1"
    store.setItem(key, "{kein-json")
    expect(cache.load()).toBeNull()
    store.setItem(key, JSON.stringify({ name: 42, kind: "genossenschaft" }))
    expect(cache.load()).toBeNull()
  })
})

describe("veranstalterOnboardingPageStateCreate restores unsent technical fields", () => {
  test("prefills from the draft cache and never persists consent", async () => {
    const backing = new Map<string, string>()
    const store = {
      getItem: (key: string) => backing.get(key) ?? null,
      setItem: (key: string, value: string) => void backing.set(key, value),
      removeItem: (key: string) => void backing.delete(key),
    }
    const cache = veranstalterOnboardingDraftCacheCreate(store, "user-1")
    cache.saveNow(validDraft())

    let restoredName = ""
    let restoredConsent = true
    let dispose!: () => void
    createRoot((disposeRoot) => {
      dispose = disposeRoot
      const state = veranstalterOnboardingPageStateCreate({ cache })
      restoredName = state.name.get()
      restoredConsent = state.termsAccepted.get()
      state.contactPhone.set("+49 30 123456")
      return undefined
    })
    expect(restoredName).toBe("Kulturhaus Lindenhof")
    expect(restoredConsent).toBe(false)

    // Idle-debounced write: wait for the debounced idle callback in tests.
    await flushEffects()
    await flushIdleWrite()
    dispose()
    expect(backing.get("eventoren.veranstalterOnboardingDraft.v2:user-1")).toContain("+49 30 123456")
  })
})
