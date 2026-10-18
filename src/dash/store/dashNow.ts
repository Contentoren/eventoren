import { createSignal, onCleanup, type Accessor } from "solid-js"

let dashNowValue: Accessor<Date> | null = null
let dashNowCleanup: (() => void) | null = null

export function dashNow(): Accessor<Date> {
  if (dashNowValue) return dashNowValue
  if (typeof window === "undefined") {
    const fixed = new Date()
    const value = () => fixed
    dashNowValue = value
    return value
  }
  const [now, setNow] = createSignal(new Date())
  const interval = window.setInterval(() => setNow(new Date()), 30_000)
  dashNowCleanup = () => {
    window.clearInterval(interval)
    dashNowCleanup = null
    dashNowValue = null
  }
  if (typeof onCleanup === "function") {
    try {
      onCleanup(() => dashNowCleanup?.())
    } catch {
      // außerhalb einer Komponente: Intervall lebt bis zum Reload
    }
  }
  dashNowValue = now
  return now
}
