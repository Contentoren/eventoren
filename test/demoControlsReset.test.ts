import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { demoText } from "../src/demo/model/demoText.ts"
import { demoControlsStateCreate } from "../src/demo/state/demoControlsStateCreate.ts"

describe("demoControlsStateCreate Plattform-Reset", () => {
  test("resetDemo setzt zurück und lädt neu (German Label, mdi-Button bleibt Komponente)", () => {
    createRoot((dispose) => {
      let resets = 0
      let reloads = 0
      const state = demoControlsStateCreate({
        reset: () => {
          resets += 1
        },
        location: {
          reload: () => {
            reloads += 1
          },
        },
      })

      expect(state.resetDemoText()).toBe("Plattform-Demo zurücksetzen")
      expect(demoText("controlsResetDemo")).toBe("Plattform-Demo zurücksetzen")

      state.resetDemo()
      expect(resets).toBe(1)
      expect(reloads).toBe(1)

      dispose()
    })
  })

  test("DemoControls-Ansicht nutzt Button-Komponente statt nativem button", async () => {
    const source = await Bun.file(new URL("../src/demo/ui/DemoControls.tsx", import.meta.url)).text()
    expect(source).not.toContain("<" + "button")
    expect(source).toContain("resetDemoText")
    expect(source).toContain("mdiRestore")
    expect(source).toContain("demoControlsStateCreate")
  })
})
