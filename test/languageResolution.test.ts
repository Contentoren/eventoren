import { expect, test } from "bun:test"
import { language, languageDefault } from "../src/app/i18n/language.ts"
import { languageFromBrowser } from "../src/app/i18n/languageFromBrowser.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"

test("uses German as the default UI language", () => {
  expect(languageDefault).toBe(language.de)
})

test("keeps the language in memory without accessing browser storage", () => {
  const previousLocalStorage = Object.getOwnPropertyDescriptor(globalThis, "localStorage")
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    get: () => {
      throw new Error("language must not access browser storage")
    },
  })

  try {
    languageSignal.set(language.de)
    expect(languageSignal.get()).toBe(language.de)
  } finally {
    if (previousLocalStorage) Object.defineProperty(globalThis, "localStorage", previousLocalStorage)
    else Reflect.deleteProperty(globalThis, "localStorage")
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
