import type { FunctionArgs, FunctionReference, FunctionReturnType, PaginationOptions } from "convex/server"
import { convexToJson, type Value } from "convex/values"
import {
  type Accessor,
  batch,
  createMemo,
  createRenderEffect,
  createRoot,
  getOwner,
  onCleanup,
  untrack,
  useContext,
} from "solid-js"
import { createResult, createResultError, type Result, type ResultErr } from "#result"
import { eventorenAuthContext } from "#src/auth/ui/eventorenAuthContext.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { queryCreate } from "./queryCreate.ts"

type Page = {
  readonly page: readonly unknown[]
  readonly isDone: boolean
  readonly continueCursor: string
  readonly pageStatus?: "SplitRecommended" | "SplitRequired" | null
}
type PageQuery = FunctionReference<"query", "public", any, Result<Page>>
type PageArgs<Query extends PageQuery> = Omit<FunctionArgs<Query>, "token" | "paginationOpts">
type PageData<Query extends PageQuery> = Extract<FunctionReturnType<Query>, { success: true }>["data"]
type PageItem<Query extends PageQuery> = PageData<Query>["page"][number]

/** Live, token-protected pages. `undefined` args disable and clear the entire chain.
 * In load-more mode `result` includes the resolved prefix while the next page loads.
 * In all-pages mode `result` remains pending until exhaustion (or a Result error).
 * `pages` preserves backend Results and pagination metadata without transformation.
 * Result-wrapped/custom-cursor queries cannot use Convex's native pagination
 * client. A SplitRequired page fails explicitly rather than aggregating partial data.
 */
export function queryPaginatedCreate<Query extends PageQuery>(
  query: Query,
  args: PageArgs<Query> | Accessor<PageArgs<Query> | undefined> | undefined,
  options: { readonly pageSize?: number; readonly allPages?: boolean } = {},
): {
  result: Accessor<Result<readonly PageItem<Query>[]> | undefined>
  pages: Accessor<readonly (FunctionReturnType<Query> | ResultErr | undefined)[]>
  isLoading: Accessor<boolean>
  isDone: Accessor<boolean>
  loadMore: () => void
} {
  const op = "queryPaginatedCreate"
  const auth = useContext(eventorenAuthContext)
  const pageSize = options.pageSize ?? 50
  const result = createSignalObject<Result<readonly PageItem<Query>[]> | undefined>(undefined)
  const pages = createSignalObject<readonly (FunctionReturnType<Query> | ResultErr | undefined)[]>([])
  const isLoading = createSignalObject(false)
  const isDone = createSignalObject(false)
  const getArgs = typeof args === "function" ? args : () => args
  // Convex encoding handles IDs, bigint and bytes, and canonicalizes object keys.
  const argsState = createMemo<Result<{ key: string; value: PageArgs<Query> }> | undefined>(
    () => {
      const value = getArgs()
      if (value === undefined) return undefined
      try {
        return createResult({ key: JSON.stringify(convexToJson(value as Value)), value })
      } catch (error) {
        return createResultError(op, error instanceof Error ? error.message : String(error))
      }
    },
    undefined,
    {
      equals: (prior, next) => {
        if (!prior || !next) return prior === next
        if (!prior.success || !next.success) return false
        return prior.data.key === next.data.key
      },
    },
  )
  let requestMore: () => void = () => undefined

  const clear = () =>
    batch(() => {
      requestMore = () => undefined
      result.set(undefined)
      pages.set([])
      isLoading.set(false)
      isDone.set(false)
    })

  createRenderEffect(() => {
    const token = auth.token()
    const ready = auth.ready()
    const state = argsState()
    clear()
    if (!ready || !token || state === undefined) return
    if (!state.success) {
      result.set(state)
      return
    }
    if (!Number.isInteger(pageSize) || pageSize < 1) {
      result.set(createResultError(op, "pageSize must be a positive integer"))
      return
    }
    const currentArgs = state.data.value
    const parent = getOwner()
    const dispose = untrack(() =>
      createRoot((disposeSession) => {
        const owner = getOwner()
        type OwnedPage = {
          cursor: string | null
          read: Accessor<FunctionReturnType<Query> | ResultErr | undefined>
          dispose: () => void
        }
        const ownedPages = createSignalObject<readonly OwnedPage[]>([])
        const requestedPages = createSignalObject(1)
        const truncate = (count: number) => {
          const current = untrack(ownedPages.get)
          if (current.length <= count) return
          ownedPages.set(current.slice(0, count))
          for (const page of current.slice(count)) page.dispose()
        }
        const append = (cursor: string | null) => {
          const page = createRoot(
            (disposePage) => ({
              cursor,
              read: queryCreate(query, {
                ...currentArgs,
                paginationOpts: { numItems: pageSize, cursor } satisfies PaginationOptions,
              } as Omit<FunctionArgs<Query>, "token">),
              dispose: disposePage,
            }),
            owner,
          )
          ownedPages.set([...untrack(ownedPages.get), page])
        }
        onCleanup(() => {
          for (const page of untrack(ownedPages.get)) page.dispose()
          clear()
        })
        append(null)
        requestMore = () =>
          untrack(() => {
            if (options.allPages || isLoading.get() || isDone.get() || !result.get()?.success) return
            requestedPages.set(ownedPages.get().length + 1)
          })

        createRenderEffect(() => {
          const current = ownedPages.get()
          const demand = requestedPages.get()
          const snapshots: (FunctionReturnType<Query> | ResultErr | undefined)[] = []
          const items: PageItem<Query>[] = []
          const cursors = new Set<string | null>()
          let aggregate: Result<readonly PageItem<Query>[]> | undefined
          let loading = false
          let done = false
          for (const [index, page] of current.entries()) {
            cursors.add(page.cursor)
            const value = page.read()
            snapshots.push(value)
            if (!value || !value.success) {
              truncate(index + 1)
              loading = value === undefined
              aggregate = value ?? (!options.allPages && index > 0 ? createResult(items) : undefined)
              break
            }
            if (value.data.pageStatus === "SplitRequired") {
              truncate(index + 1)
              aggregate = createResultError(op, "Pagination requires a split; the backend page is incomplete")
              break
            }
            items.push(...(value.data.page as readonly PageItem<Query>[]))
            if (value.data.isDone) {
              truncate(index + 1)
              done = true
              aggregate = createResult(items)
              break
            }
            const cursor = value.data.continueCursor
            if (cursors.has(cursor)) {
              truncate(index + 1)
              aggregate = createResultError(op, "Pagination cursor did not advance")
              break
            }
            const next = current[index + 1]
            // A changed boundary invalidates every downstream subscription/result,
            // but retains load-more demand so the same depth is rebuilt live.
            if (next && next.cursor !== cursor) truncate(index + 1)
            if (!next || next.cursor !== cursor) {
              if (options.allPages || index + 1 < demand) {
                append(cursor)
                snapshots.push(undefined)
                loading = true
              }
              aggregate = options.allPages ? undefined : createResult(items)
              break
            }
          }
          batch(() => {
            pages.set(snapshots)
            result.set(aggregate)
            isLoading.set(loading)
            isDone.set(done)
          })
        })
        return disposeSession
      }, parent),
    )
    onCleanup(dispose)
  })
  onCleanup(clear)

  return {
    result: result.get,
    pages: pages.get,
    isLoading: isLoading.get,
    isDone: isDone.get,
    loadMore: () => requestMore(),
  }
}
