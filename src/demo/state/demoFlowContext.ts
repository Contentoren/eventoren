import type { Accessor } from "solid-js"
import { createContext } from "solid-js"
import { demoFlowStateList } from "../model/demoFlowStateList.ts"
import type { DemoFlowState } from "../model/demoFlowStateSchema.ts"

export type DemoFlowContextValue = {
  readonly state: Accessor<DemoFlowState>
  readonly setState: (state: DemoFlowState) => void
  readonly isLoaded: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly isEmpty: Accessor<boolean>
  readonly isError: Accessor<boolean>
  readonly supportedStates: Accessor<readonly DemoFlowState[]>
  readonly hasFlowStates: Accessor<boolean>
  readonly defaultState: Accessor<DemoFlowState>
  readonly reset: () => void
}

const defaultContextValue: DemoFlowContextValue = {
  state: () => "loaded",
  setState: () => undefined,
  isLoaded: () => true,
  isLoading: () => false,
  isEmpty: () => false,
  isError: () => false,
  supportedStates: () => demoFlowStateList,
  hasFlowStates: () => false,
  defaultState: () => "loaded",
  reset: () => undefined,
}

export const demoFlowContext = createContext<DemoFlowContextValue>(defaultContextValue)
