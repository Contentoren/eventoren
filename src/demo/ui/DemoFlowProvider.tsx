import type { Accessor, JSX } from "solid-js"
import { demoFlowContext } from "../state/demoFlowContext.ts"
import { demoFlowProviderStateCreate } from "../state/demoFlowProviderStateCreate.ts"

export function DemoFlowProvider(props: {
  readonly pathname?: Accessor<string>
  readonly search?: Accessor<string>
  readonly children: JSX.Element
}) {
  const state = demoFlowProviderStateCreate(props)

  return <demoFlowContext.Provider value={state.context}>{props.children}</demoFlowContext.Provider>
}
