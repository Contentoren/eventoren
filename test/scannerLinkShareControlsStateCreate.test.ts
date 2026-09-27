import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { scannerLinkShareControlsStateCreate } from "../src/organizer/scannerLinkShareControlsStateCreate.ts"

test("clipboard denial selects the link and reports that manual copying is needed", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  let selected = false
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async () => Promise.reject(new Error("denied")) } },
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { origin: "https://example.test" } },
  })
  let state!: ReturnType<typeof scannerLinkShareControlsStateCreate>
  const dispose = createRoot((done) => {
    state = scannerLinkShareControlsStateCreate(
      () => "/scanner/secret",
      () => "Scanner",
      () => {
        selected = true
      },
    )
    return done
  })

  try {
    await state.copy()
    expect(selected).toBe(true)
    expect(state.message()).toContain("nicht kopiert")
    expect(state.message()).toContain("markiert")

    selected = false
    await state.share()
    expect(selected).toBe(true)
    expect(state.message()).toContain("nicht kopiert")
  } finally {
    dispose()
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator)
    else Reflect.deleteProperty(globalThis, "navigator")
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else Reflect.deleteProperty(globalThis, "window")
  }
})

test("successful copy reports completion", async () => {
  const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
  let copiedUrl = ""
  Object.defineProperty(globalThis, "navigator", {
    configurable: true,
    value: { clipboard: { writeText: async (value: string) => void (copiedUrl = value) } },
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: { location: { origin: "https://example.test" } },
  })
  let state!: ReturnType<typeof scannerLinkShareControlsStateCreate>
  const dispose = createRoot((done) => {
    state = scannerLinkShareControlsStateCreate(
      () => "/scanner/secret",
      () => "Scanner",
      () => {},
    )
    return done
  })

  try {
    await state.copy()
    expect(copiedUrl).toBe("https://example.test/scanner/secret")
    expect(state.message()).toBe("Link kopiert.")
  } finally {
    dispose()
    if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator)
    else Reflect.deleteProperty(globalThis, "navigator")
    if (originalWindow) Object.defineProperty(globalThis, "window", originalWindow)
    else Reflect.deleteProperty(globalThis, "window")
  }
})
