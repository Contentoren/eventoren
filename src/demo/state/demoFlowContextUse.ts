import { useContext } from "solid-js"
import { demoFlowContext, type DemoFlowContextValue } from "./demoFlowContext.ts"

export function demoFlowContextUse(): DemoFlowContextValue {
  return useContext(demoFlowContext)
}
