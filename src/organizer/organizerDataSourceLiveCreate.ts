import type { PaginationOptions } from "convex/server"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerDataSource, OrganizerReactiveQuery } from "./OrganizerDataSource.ts"
import type { OrganizerEvent } from "./OrganizerEvent.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"
import type { OrganizerTicketListPage } from "./OrganizerTicketListPage.ts"
import { api } from "#convex/_generated/api.js"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"

type NativeResult<T> =
  | { readonly success: true; readonly data: T }
  | {
      readonly success: false
      readonly errorMessage: string
      readonly code?: string
      readonly errorCode?: string
      readonly errorData?: string | null
    }

/** Native live source for authenticated browser reads and mutations. */
export function organizerDataSourceLiveCreate(): OrganizerDataSource {
  const eventListResult = () => {
    const pages = queryPaginatedCreate(api.organizer.organizerEventListQuery, {}, { pageSize: 50, allPages: true })
    return () => resultMap(pages.result(), (events): readonly OrganizerEvent[] => events)
  }

  const eventGetResult = (eventKey: () => string) =>
    resultMapAccessor<OrganizerEvent, OrganizerEvent>(
      queryCreate(api.organizer.organizerEventGetQuery, () => ({ eventKey: eventKey() })),
    )

  const ticketListResult = (
    eventKey: () => string,
    search: () => string,
  ): OrganizerReactiveQuery<OrganizerTicketListPage> => {
    const pages = queryPaginatedCreate(
      api.organizer.organizerEventTicketListQuery,
      () => ({ eventKey: eventKey(), ...(search().trim() ? { search: search().trim() } : {}) }),
      { pageSize: 50 },
    )
    return {
      result: () => {
        const aggregate = pages.result()
        if (!aggregate) return undefined
        if (aggregate.success === false) return organizerError(aggregate)
        const resolved = pages.pages().filter(isTicketPageResult) as readonly {
          readonly success: true
          readonly data: OrganizerTicketListPage
        }[]
        const last = resolved.at(-1)
        if (!last) return undefined
        return {
          success: true,
          data: {
            page: aggregate.data,
            isDone: last.data.isDone,
            continueCursor: last.data.continueCursor,
          },
        }
      },
      loadMore: pages.loadMore,
    }
  }

  const ticketGetResult = (eventKey: () => string, ticketId: () => OrganizerTicket["id"] | undefined) =>
    resultMapAccessor<OrganizerTicket, OrganizerTicket>(
      queryCreate(api.organizer.organizerEventTicketGetQuery, () => {
        const id = ticketId()
        return id ? { eventKey: eventKey(), ticketId: id } : undefined
      }),
    )

  const ticketCheckInMutation = mutationCreate(api.organizer.organizerTicketCheckInMutation)
  const ticketResetMutation = mutationCreate(api.organizer.organizerTicketCheckInResetMutation)
  const notForBrowser = <T>(): Promise<OrganizerDataResult<T>> =>
    Promise.resolve({ success: false, errorMessage: "Use the native reactive organizer source in the browser." })

  return {
    eventListResult,
    eventGetResult,
    ticketListResult,
    ticketGetResult,
    // One-shot reads remain on organizerDataSourceServerCreate for explicit SSR callers.
    eventList: () => notForBrowser(),
    eventGet: () => notForBrowser(),
    ticketList: (_eventKey: string, _search: string, _paginationOpts: PaginationOptions) => notForBrowser(),
    ticketGet: () => notForBrowser(),
    ticketCheckIn: async (eventKey, ticketId) => {
      const result = await ticketCheckInMutation({ eventKey, ticketId })
      return mutationTicketResult(result)
    },
    ticketCheckInCode: async (eventKey, ticketCode) => {
      const result = await ticketCheckInMutation({ eventKey, ticketCode })
      return mutationTicketResult(result)
    },
    ticketReset: async (eventKey, ticketId) => {
      const result = await ticketResetMutation({ eventKey, ticketId })
      return mutationTicketResult(result)
    },
  }
}

function resultMap<TInput, TOutput>(
  result: NativeResult<TInput> | OrganizerDataResult<TInput> | undefined,
  map: (value: TInput) => TOutput,
): OrganizerDataResult<TOutput> | undefined {
  if (!result) return undefined
  if (!result.success) return organizerError(result)
  return { success: true, data: map(result.data) }
}

function resultMapAccessor<TInput, TOutput>(
  accessor: () => NativeResult<TInput> | OrganizerDataResult<TInput> | undefined,
): () => OrganizerDataResult<TOutput> | undefined {
  return () => resultMap(accessor(), (value) => value as unknown as TOutput)
}

function organizerError(error: {
  readonly errorMessage: string
  readonly code?: string
  readonly errorCode?: string
  readonly errorData?: string | null
}) {
  return {
    success: false as const,
    errorMessage: error.errorMessage,
    ...((error.errorCode ?? error.code) ? { errorCode: error.errorCode ?? error.code } : {}),
    ...(error.errorData ? { errorData: error.errorData } : {}),
  }
}

function isTicketPageResult(
  value: unknown,
): value is { readonly success: true; readonly data: OrganizerTicketListPage } {
  return (
    typeof value === "object" &&
    value !== null &&
    "success" in value &&
    value.success === true &&
    "data" in value &&
    typeof value.data === "object" &&
    value.data !== null &&
    "page" in value.data &&
    "isDone" in value.data &&
    "continueCursor" in value.data
  )
}

function mutationTicketResult<T>(result: T): OrganizerDataResult<OrganizerTicket> {
  const value = result as {
    success: boolean
    data?: { ticket: OrganizerTicket }
    errorMessage?: string
    code?: string
    errorCode?: string
    errorData?: string
  }
  if (value.success && value.data) return { success: true, data: value.data.ticket }
  return {
    success: false,
    errorMessage: value.errorMessage ?? "Organizer ticket action failed.",
    ...((value.errorCode ?? value.code) ? { errorCode: value.errorCode ?? value.code } : {}),
    ...(value.errorData ? { errorData: value.errorData } : {}),
  }
}
