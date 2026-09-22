import type { Accessor } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { demoFlowRouteCapabilityResolve } from "../model/demoFlowRouteCapabilityResolve.ts"
import type { DemoFlowState } from "../model/demoFlowStateSchema.ts"
import { demoFlowStateUrlRead } from "../model/demoFlowStateUrlRead.ts"
import { demoFlowUrlSync } from "../model/demoFlowUrlSync.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"

export type DemoFlowProviderStateInputs = {
  readonly pathname?: Accessor<string>
  readonly search?: Accessor<string>
  readonly onStateChange?: (state: DemoFlowState) => void
}

type DemoFlowOverride = {
  readonly route: string
  readonly state: DemoFlowState
}

export function demoFlowProviderStateCreate(inputs: DemoFlowProviderStateInputs = {}) {
  const currentPathname: Accessor<string> =
    inputs.pathname ?? (() => (typeof window !== "undefined" ? window.location.pathname : "/"))

  const currentSearch: Accessor<string> =
    inputs.search ?? (() => (typeof window !== "undefined" ? window.location.search : ""))

  const capability = () => demoFlowRouteCapabilityResolve(currentPathname())

  const initialUrlState = demoFlowStateUrlRead(currentSearch())
  const initialCap = demoFlowRouteCapabilityResolve(currentPathname())
  const initialOverride: DemoFlowOverride | null =
    initialCap.isDataLoading && initialUrlState ? { route: currentPathname(), state: initialUrlState } : null

  const overrideSignal = createSignalObject<DemoFlowOverride | null>(initialOverride)

  const currentState = (): DemoFlowState => {
    const override = overrideSignal.get()
    const path = currentPathname()
    if (override && override.route === path) {
      return override.state
    }
    const cap = capability()
    const urlState = demoFlowStateUrlRead(currentSearch())
    if (cap.isDataLoading && urlState) {
      return urlState
    }
    return cap.defaultState
  }

  const setState = (next: DemoFlowState) => {
    const path = currentPathname()
    const cap = capability()
    overrideSignal.set({ route: path, state: next })
    demoFlowUrlSync(next, cap.defaultState)
    inputs.onStateChange?.(next)
  }

  const reset = () => {
    const cap = capability()
    overrideSignal.set(null)
    demoFlowUrlSync(cap.defaultState, cap.defaultState)
    inputs.onStateChange?.(cap.defaultState)
  }

  const context: DemoFlowContextValue = {
    state: currentState,
    setState,
    isLoaded: () => currentState() === "loaded",
    isLoading: () => currentState() === "loading",
    isEmpty: () => currentState() === "empty",
    isError: () => currentState() === "error",
    supportedStates: () => capability().supportedStates,
    hasFlowStates: () => capability().isDataLoading,
    defaultState: () => capability().defaultState,
    reset,
  }

  return { context }
}
