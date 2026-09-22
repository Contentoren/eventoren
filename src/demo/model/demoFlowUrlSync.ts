import type { DemoFlowState } from "./demoFlowStateSchema.ts"

export function demoFlowUrlSync(nextState: DemoFlowState, defaultState: DemoFlowState): void {
  if (typeof window === "undefined") return
  try {
    const url = new URL(window.location.href)
    if (nextState === defaultState) {
      url.searchParams.delete("demoState")
    } else {
      url.searchParams.set("demoState", nextState)
    }
    const nextUrl = url.pathname + (url.searchParams.toString() ? `?${url.searchParams.toString()}` : "") + url.hash
    window.history.replaceState(window.history.state, "", nextUrl)
  } catch {
    // ignore in non-browser/restricted environments
  }
}
