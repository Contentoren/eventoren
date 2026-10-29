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
  let lastArgsKey: string | undefined
  let lastToken: string | null | undefined

  const subscribe = (currentSubscriptionId: number, queryArgs: TokenQueryArgs<Query>, token: string): void => {
    let unsubscribe: () => void = () => undefined
    try {
      unsubscribe = client!.onUpdate(
        query,
        { ...queryArgs, token } as FunctionArgs<Query>,
        (nextResult) => {
          if (currentSubscriptionId !== subscriptionId) return
          setResult(nextResult)
        },
        () => {
          if (currentSubscriptionId !== subscriptionId) return
          // Convex validation failures echo call args: never log or display
          // the raw message because it discloses the signed session token.
          console.error(op, "Live-Abfrage fehlgeschlagen.")
          setResult(createResultError(op, "Die Daten konnten nicht geladen werden. Bitte Seite neu laden."))
        },
      )
    } catch {
      console.error(op, "Live-Abfrage fehlgeschlagen.")
      setResult(createResultError(op, "Die Daten konnten nicht geladen werden. Bitte Seite neu laden."))
    }
    onCleanup(() => {
      if (currentSubscriptionId === subscriptionId) subscriptionId += 1
      unsubscribe()
    })
  }

  createRenderEffect(() => {
    const token = auth.token()
    const isReady = auth.ready()
    const queryArgs = getArgs()
    const argsKey = queryArgs === undefined ? undefined : JSON.stringify(queryArgs)
    const sameArgs = lastArgsKey !== undefined && argsKey !== undefined && lastArgsKey === argsKey
    // A session refetch (e.g. on tab focus) yields a new token string while
    // the underlying session is unchanged. Resubscribing with that token
    // keeps the visible data; clearing it would flicker every subscriber
    // (and unmount stateful pages) on each focus event.
    const refetchOnly =
      sameArgs && lastToken !== undefined && token !== lastToken && token !== null && isReady && client !== undefined
    lastArgsKey = argsKey
    lastToken = token
    if (refetchOnly && queryArgs !== undefined) {
      subscribe(++subscriptionId, queryArgs, token!)
      return
    }
    const currentSubscriptionId = ++subscriptionId
    setResult(undefined)
    if (!isReady || !token || queryArgs === undefined) return
    if (!client) {
      setResult(createResultError(op, "No Convex client"))
      return
    }

    subscribe(currentSubscriptionId, queryArgs, token)
  })

  return result
}
