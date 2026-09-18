import { expect, test } from "bun:test"
import { language, languageDefault } from "../src/app/i18n/language.ts"
import { languageFromBrowser } from "../src/app/i18n/languageFromBrowser.ts"
import { languageLoadFromLocalStorage } from "../src/app/i18n/languageSignal.ts"

test("uses German as the default UI language", () => {
  expect(languageDefault).toBe(language.de)
})

test("resolves a stale persisted language to German", () => {
  const previousLocalStorage = globalThis.localStorage
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: { getItem: () => "en" },
  })

  try {
    expect(languageLoadFromLocalStorage()).toMatchObject({ success: true, data: language.de })
  } finally {
    Object.defineProperty(globalThis, "localStorage", { configurable: true, value: previousLocalStorage })
  }
})

test("does not select a browser language other than German", () => {
  const previousWindow = globalThis.window
  Object.defineProperty(globalThis, "window", { configurable: true, value: {} })

  try {
    expect(languageFromBrowser()).toBe(language.de)
  } finally {
    Object.defineProperty(globalThis, "window", { configurable: true, value: previousWindow })
  }
})
