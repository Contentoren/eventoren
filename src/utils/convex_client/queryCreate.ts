import type { FunctionArgs, FunctionReference, FunctionReturnType } from "convex/server"
import { type Accessor, createRenderEffect, createSignal, onCleanup, useContext } from "solid-js"
import { createResultError, type ResultErr } from "#result"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { convexClientContext } from "./convexClientContext.ts"

type TokenQueryArgs<Query extends FunctionReference<"query">> = Omit<FunctionArgs<Query>, "token">
type QueryArgs<Query extends FunctionReference<"query">> =
  | undefined
  | TokenQueryArgs<Query>
  | Accessor<TokenQueryArgs<Query> | undefined>

export function queryCreate<Query extends FunctionReference<"query">>(
  query: Query,
  args: QueryArgs<Query> = undefined,
): Accessor<FunctionReturnType<Query> | ResultErr | undefined> {
  const op = "queryCreate"
  const client = useContext(convexClientContext)
  const auth = useContext(eventorenAuthContext)
  const [result, setResult] = createSignal<FunctionReturnType<Query> | ResultErr | undefined>(undefined, {
    equals: false,
  })
  let subscriptionId = 0
  const getArgs: Accessor<TokenQueryArgs<Query> | undefined> =
    typeof args === "function" ? (args as Accessor<TokenQueryArgs<Query> | undefined>) : () => args

  createRenderEffect(() => {
    const token = auth.token()
    const isReady = auth.ready()
    const queryArgs = getArgs()
    const currentSubscriptionId = ++subscriptionId
    setResult(undefined)
    if (!isReady || !token || queryArgs === undefined) return
    if (!client) {
      setResult(createResultError(op, "No Convex client"))
      return
    }

    let unsubscribe: () => void = () => undefined
    try {
      unsubscribe = client.onUpdate(
        query,
        { ...queryArgs, token } as FunctionArgs<Query>,
        (nextResult) => {
          if (currentSubscriptionId !== subscriptionId) return
          setResult(nextResult)
        },
        (error) => {
          if (currentSubscriptionId !== subscriptionId) return
          setResult(createResultError(op, error.message))
        },
      )
    } catch (error) {
      setResult(createResultError(op, error instanceof Error ? error.message : String(error)))
    }
    onCleanup(() => {
      if (currentSubscriptionId === subscriptionId) subscriptionId += 1
      unsubscribe()
    })
  })

  return result
}
