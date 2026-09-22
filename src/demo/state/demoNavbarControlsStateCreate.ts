import type { DemoFlowState } from "../model/demoFlowStateSchema.ts"
import { demoFlowStateText } from "../model/demoFlowStateText.ts"
import type { DemoFlowContextValue } from "./demoFlowContext.ts"
import { demoFlowContextUse } from "./demoFlowContextUse.ts"

export type DemoNavbarControlsOption = {
  readonly state: DemoFlowState
  readonly label: string
  readonly active: () => boolean
  readonly select: () => void
}

export function demoNavbarControlsStateCreate(injectedFlow?: DemoFlowContextValue) {
  const flow = injectedFlow ?? demoFlowContextUse()

  const options = () =>
    flow.supportedStates().map((state) => ({
      state,
      label: demoFlowStateText(state),
      active: () => flow.state() === state,
      select: () => flow.setState(state),
    }))

  const showReset = () => flow.hasFlowStates() && flow.state() !== flow.defaultState()

  return {
    hasFlowStates: flow.hasFlowStates,
    options,
    showReset,
    reset: flow.reset,
  }
}
