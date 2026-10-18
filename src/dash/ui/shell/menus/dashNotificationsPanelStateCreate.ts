import { createSignalObject } from "#ui/utils/createSignalObject.js"

const dashNotificationsReadKey = "eventoren-demo-notifications-read-v1"

function dashNotificationsReadLoad(): Array<string> {
  if (typeof window === "undefined" || typeof window.localStorage === "undefined") return []
  try {
    const raw = window.localStorage.getItem(dashNotificationsReadKey)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter((entry): entry is string => typeof entry === "string") : []
  } catch {
    return []
  }
}

export function dashNotificationsPanelStateCreate() {
  const open = createSignalObject(false)
  const readIds = createSignalObject<Array<string>>(dashNotificationsReadLoad())
  const markAllRead = (visibleIds: Array<string>) => {
    const merged = Array.from(new Set([...readIds.get(), ...visibleIds]))
    readIds.set(merged)
    if (typeof window !== "undefined" && typeof window.localStorage !== "undefined") {
      try {
        window.localStorage.setItem(dashNotificationsReadKey, JSON.stringify(merged))
      } catch {
        // Demo-Hinweis-Status ist optional, Fehler werden ignoriert.
      }
    }
    open.set(false)
  }
  return { open, readIds, markAllRead }
}

export type DashNotificationsPanelState = ReturnType<typeof dashNotificationsPanelStateCreate>
