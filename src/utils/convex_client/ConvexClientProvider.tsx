import { ConvexClient } from "convex/browser"
import type { ParentProps } from "solid-js"
import { convexClientContext } from "./convexClientContext.ts"
import { convexClientProviderStateCreate } from "./convexClientProviderStateCreate.ts"

export function ConvexClientProvider(props: ParentProps) {
  const state = convexClientProviderStateCreate()

  return <convexClientContext.Provider value={state.client}>{props.children}</convexClientContext.Provider>
}
