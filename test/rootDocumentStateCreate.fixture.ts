import { afterEach, beforeEach, expect, mock, spyOn, test } from "bun:test"
import * as solid from "solid-js"
import * as themeSignal from "#ui/interactive/theme/themeSignal.js"
import * as themeVariant from "#ui/interactive/theme/themeVariant.js"
import * as publicTheme from "../src/theme/themeApply.ts"

let pathname: string
let routeEffect: (() => void) | undefined

// This persistent router mock stays inside the subprocess running this fixture.
mock.module("@tanstack/solid-router", () => ({
  useLocation: () => () => ({ pathname }),
}))

const { rootDocumentStateCreate } = await import("../src/app/i18n/rootDocumentStateCreate.ts")

beforeEach(() => {
  routeEffect = undefined
  // Bun uses Solid's server runtime; capture the scheduled route effect to run it explicitly.
  spyOn(solid, "createEffect").mockImplementation((effect: solid.EffectFunction<unknown>) => {
    routeEffect = () => effect(undefined)
  })
  spyOn(themeVariant, "getThemeFromStorageOrBrowserPref").mockReturnValue("dark")
  spyOn(themeSignal, "themeSet").mockImplementation(() => {})
  spyOn(publicTheme, "themeApply").mockImplementation(() => {})
})

afterEach(() => {
  mock.restore()
})

test.each(["/admin", "/admin/events", "/organizer", "/organizer/event/example"])(
  "%s restores the saved theme without writing storage, including after a public route",
  (managementPath) => {
    pathname = managementPath
    solid.createRoot((dispose) => {
      try {
        rootDocumentStateCreate()
        expect(routeEffect).toBeDefined()
        routeEffect?.()
        expect(themeSignal.themeSet).toHaveBeenCalledWith("dark", false)
        expect(publicTheme.themeApply).not.toHaveBeenCalled()

        pathname = "/events"
        routeEffect?.()
        expect(publicTheme.themeApply).toHaveBeenCalledWith("light")
        expect(themeSignal.themeSet).toHaveBeenCalledTimes(1)

        pathname = managementPath
        routeEffect?.()
        expect(themeVariant.getThemeFromStorageOrBrowserPref).toHaveBeenCalledTimes(2)
        expect(themeSignal.themeSet).toHaveBeenCalledTimes(2)
        expect(themeSignal.themeSet).toHaveBeenLastCalledWith("dark", false)
        expect(publicTheme.themeApply).toHaveBeenCalledTimes(1)
      } finally {
        dispose()
      }
    })
  },
)

test.each(["/", "/events", "/administer", "/organizers"])("%s keeps the public light theme", (publicPath) => {
  pathname = publicPath
  solid.createRoot((dispose) => {
    try {
      rootDocumentStateCreate()
      expect(routeEffect).toBeDefined()
      routeEffect?.()
      expect(publicTheme.themeApply).toHaveBeenCalledWith("light")
      expect(themeVariant.getThemeFromStorageOrBrowserPref).not.toHaveBeenCalled()
      expect(themeSignal.themeSet).not.toHaveBeenCalled()
    } finally {
      dispose()
    }
  })
})
