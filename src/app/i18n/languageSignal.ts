import { onCleanup, onMount } from "solid-js"
import { createResult, createResultError } from "#result"
import { type Language, languageDefault } from "#src/app/i18n/language.ts"
import { languageFromBrowser } from "#src/app/i18n/languageFromBrowser.ts"
import { createSignalObject, type SignalObject } from "#ui/utils/createSignalObject.ts"

const languageLocalStorageKey = "language"

export const languageSignal: SignalObject<Language> = createLanguageSignal()

function createLanguageSignal(): SignalObject<Language> {
  const signal = createSignalObject<Language>(languageDefault)

  // Override the set method to also save to localStorage
  const signalSet = signal.set
  signal.set = (value) => {
    const result = signalSet(value)
    languageSaveToLocalStorage(value)
    return result
  }

  return signal
}

export function languageLoadFromLocalStorage() {
  const op = "languageLoadFromLocalStorage"
  if (typeof localStorage === "undefined") return createResultError(op, "localStorage not defined")
  const read = localStorage.getItem(languageLocalStorageKey)
  if (read === null) return createResultError(op, "no language saved in localStorage")

  // Stored language values may come from an older multilingual UI. Resolve all of them to German.
  return createResult(languageDefault)
}

export function languageSaveToLocalStorage(language: Language) {
  if (typeof localStorage === "undefined") return
  localStorage.setItem(languageLocalStorageKey, language)
}

export function languageSignalRegisterHandler(signal = languageSignal) {
  function handleStorageEvent(event: StorageEvent) {
    if (event.key !== languageLocalStorageKey) return
    if (event.newValue === null) return
    signal.set(languageDefault)
  }
  onMount(() => {
    if (typeof window === "undefined") return

    let cancelled = false
    // Keep the first hydrated render on the server's deterministic language.
    queueMicrotask(() => {
      if (cancelled) return

      const stored = languageLoadFromLocalStorage()
      const browserLanguage = languageFromBrowser()
      if (stored.success) {
        signal.set(stored.data)
      } else if (browserLanguage !== undefined) {
        signal.set(browserLanguage)
      }
      window.addEventListener("storage", handleStorageEvent)
    })

    onCleanup(() => {
      cancelled = true
      window.removeEventListener("storage", handleStorageEvent)
    })
  })
}

//
//
//

export function languageSignalGet() {
  return languageSignal.get()
}
