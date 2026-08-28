import { createMemo, onCleanup, onMount } from "solid-js"
import type { ThemeMode } from "./ThemeMode.ts"
import { themeApply } from "./themeApply.ts"
import { themeModeDefault } from "./themeModeDefault.ts"
import { themeModeResolve } from "./themeModeResolve.ts"
import { themeModeStorageKey } from "./themeModeStorageKey.ts"
import { themeModeStorageLoad } from "./themeModeStorageLoad.ts"
import { themeModeStorageSave } from "./themeModeStorageSave.ts"
import { themeSignalObjectCreate } from "./themeSignalObjectCreate.ts"

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

export function themeProviderStateCreate() {
  const mode = themeSignalObjectCreate<ThemeMode>(themeModeDefault)
  const resolvedMode = createMemo(() => themeModeResolve(mode.get()))

  let debounceTimer: number | undefined
  let cancelIdleSave: (() => void) | undefined

  const cancelScheduledSave = () => {
    if (typeof window === "undefined") return

    if (debounceTimer !== undefined) {
      window.clearTimeout(debounceTimer)
      debounceTimer = undefined
    }

    cancelIdleSave?.()
    cancelIdleSave = undefined
  }

  const scheduleSave = (nextMode: ThemeMode) => {
    if (typeof window === "undefined") return

    cancelScheduledSave()
    debounceTimer = window.setTimeout(() => {
      debounceTimer = undefined
      const idleWindow = window as WindowWithIdleCallback

      const save = () => {
        cancelIdleSave = undefined
        themeModeStorageSave(nextMode)
      }

      if (typeof idleWindow.requestIdleCallback === "function") {
        const idleId = idleWindow.requestIdleCallback(save, { timeout: 1000 })
        cancelIdleSave = () => idleWindow.cancelIdleCallback?.(idleId)
        return
      }

      const fallbackTimer = window.setTimeout(save, 0)
      cancelIdleSave = () => window.clearTimeout(fallbackTimer)
    }, 180)
  }

  const applyCurrentMode = () => themeApply(themeModeResolve(mode.get()))

  const selectMode = (nextMode: ThemeMode) => {
    mode.set(nextMode)
    applyCurrentMode()
    scheduleSave(nextMode)
  }

  onMount(() => {
    if (typeof window === "undefined") return

    mode.set(themeModeStorageLoad())
    applyCurrentMode()

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== themeModeStorageKey) return

      mode.set(themeModeStorageLoad())
      applyCurrentMode()
    }

    window.addEventListener("storage", onStorage)

    onCleanup(() => {
      window.removeEventListener("storage", onStorage)
      cancelScheduledSave()
    })
  })

  return {
    context: {
      mode: mode.get,
      resolvedMode,
      selectMode,
    },
  }
}
