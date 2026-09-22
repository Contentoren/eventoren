import { expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { demoFlowContext } from "../src/demo/state/demoFlowContext.ts"
import { demoFlowProviderStateCreate } from "../src/demo/state/demoFlowProviderStateCreate.ts"
import { demoNavbarControlsStateCreate } from "../src/demo/state/demoNavbarControlsStateCreate.ts"

test("demoNavbarControlsStateCreate provides German options and handles selection", () => {
  createRoot((dispose) => {
    const { context } = demoFlowProviderStateCreate({
      pathname: () => "/demo/customer/events",
    })

    const state = demoNavbarControlsStateCreate(context)

    expect(state.hasFlowStates()).toBe(true)
    const options = state.options()
    expect(options.map((opt) => opt.label)).toEqual(["Geladen", "Lädt", "Leer", "Fehler"])
    expect(options.map((opt) => opt.state)).toEqual(["loaded", "loading", "empty", "error"])

    // Initially "loaded" is active
    expect(options[0]?.active()).toBe(true)
    expect(options[1]?.active()).toBe(false)
    expect(state.showReset()).toBe(false)

    // Select "Lädt"
    options[1]?.select()
    expect(options[1]?.active()).toBe(true)
    expect(options[0]?.active()).toBe(false)
    expect(state.showReset()).toBe(true)

    // Reset back to default
    state.reset()
    expect(options[0]?.active()).toBe(true)
    expect(state.showReset()).toBe(false)

    dispose()
  })
})

test("demoNavbarControlsStateCreate reflects non-data-loading route", () => {
  createRoot((dispose) => {
    const { context } = demoFlowProviderStateCreate({
      pathname: () => "/demo/contact",
    })

    const state = demoNavbarControlsStateCreate(context)

    expect(state.hasFlowStates()).toBe(false)
    expect(state.options()).toEqual([])

    dispose()
  })
})

test("DemoNavbarControls view component does not contain raw html button", async () => {
  const source = await Bun.file(new URL("../src/demo/ui/DemoNavbarControls.tsx", import.meta.url)).text()
  expect(source).not.toContain("<" + "button")
  expect(source).toContain("Button")
})
