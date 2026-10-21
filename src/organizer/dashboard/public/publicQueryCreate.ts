import type { FunctionReference, FunctionReturnType } from "convex/server"
import { type Accessor, createRenderEffect, createSignal, onCleanup, useContext } from "solid-js"
import { createResultError, type ResultErr } from "#result"
import { convexClientContext } from "#src/utils/convex_client/convexClientContext.ts"

type PublicQueryData<Query extends FunctionReference<"query">> = FunctionReturnType<Query>

/**
 * Live Convex subscription for the public organizer queries, which carry no
 * token arg. Unlike queryCreate this needs no login: logged-out visitors
 * subscribe directly. Only for the token-free public queries.
 */
export function publicQueryCreate<Query extends FunctionReference<"query">>(
  query: Query,
  args: undefined | Record<string, string> | Accessor<Record<string, string> | undefined> = undefined,
): Accessor<PublicQueryData<Query> | ResultErr | undefined> {
  const op = "publicQueryCreate"
  const client = useContext(convexClientContext)
  const [result, setResult] = createSignal<PublicQueryData<Query> | ResultErr | undefined>(undefined, {
    equals: false,
  })
  let subscriptionId = 0
  const getArgs: Accessor<Record<string, string> | undefined> =
    typeof args === "function" ? (args as Accessor<Record<string, string> | undefined>) : () => args

  createRenderEffect(() => {
    const queryArgs = getArgs()
    const currentSubscriptionId = ++subscriptionId
    setResult(undefined)
    if (queryArgs === undefined) return
    if (!client) {
      setResult(createResultError(op, "No Convex client"))
      return
    }

    let unsubscribe: () => void = () => undefined
    try {
      unsubscribe = client.onUpdate(
        query,
        queryArgs as never,
        (nextResult) => {
          if (currentSubscriptionId !== subscriptionId) return
          setResult(nextResult as PublicQueryData<Query>)
        },
        (error) => {
          if (currentSubscriptionId !== subscriptionId) return
          console.error(op, error)
          setResult(createResultError(op, error.message))
        },
      )
    } catch (error) {
      setResult(createResultError(op, error instanceof Error ? String(error) : "Unknown error"))
    }
    onCleanup(() => {
      if (currentSubscriptionId === subscriptionId) subscriptionId += 1
      unsubscribe()
    })
  })

  return result
}
