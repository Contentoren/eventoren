import { onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { AdminListView } from "./adminListViewSchema.ts"
import { adminListViewStorageKey } from "./adminListViewStorageKey.ts"
import { adminListViewStorageLoad } from "./adminListViewStorageLoad.ts"
import { adminListViewStorageSave } from "./adminListViewStorageSave.ts"

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number
  cancelIdleCallback?: (handle: number) => void
}

export function adminListViewPreferenceStateCreate() {
  const view = createSignalObject<AdminListView>("list")
  let debounceTimer: number | undefined
  let cancelIdleSave: (() => void) | undefined
  let scheduledView: AdminListView | undefined

  const cancelScheduledSave = () => {
    if (typeof window === "undefined") return
    if (debounceTimer !== undefined) window.clearTimeout(debounceTimer)
    debounceTimer = undefined
    cancelIdleSave?.()
    cancelIdleSave = undefined
    scheduledView = undefined
  }

  const flushScheduledSave = () => {
    const nextView = scheduledView
    cancelScheduledSave()
    if (nextView === undefined) return
    adminListViewStorageSave(nextView)
  }

  const selectView = (nextView: AdminListView) => {
    view.set(nextView)
    if (typeof window === "undefined") return

    cancelScheduledSave()
    scheduledView = nextView
    debounceTimer = window.setTimeout(() => {
      debounceTimer = undefined
      const idleWindow = window as WindowWithIdleCallback
      const save = () => {
        cancelIdleSave = undefined
        scheduledView = undefined
        adminListViewStorageSave(nextView)
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

  onMount(() => {
    if (typeof window === "undefined") return
    view.set(adminListViewStorageLoad())

    const onStorage = (event: StorageEvent) => {
      if (event.key !== null && event.key !== adminListViewStorageKey) return
      cancelScheduledSave()
      view.set(adminListViewStorageLoad())
    }

    window.addEventListener("storage", onStorage)
    onCleanup(() => {
      window.removeEventListener("storage", onStorage)
      flushScheduledSave()
    })
  })

  return { view: view.get, selectView }
}
