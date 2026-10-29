import { getRouteApi } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { api } from "#convex/_generated/api.js"
import { createResultError } from "#result"
import { eventorenAuthContextUse } from "#src/auth/ui/eventorenAuthContextUse.ts"
import { adminImageUploadFromSession } from "#src/server/adminImageUploadFromSession.ts"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { adminCatalogPageStateCreate } from "./adminCatalogPageStateCreate.ts"

const adminRoute = getRouteApi("/admin")
const uploadAdminImage = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(({ data }) => adminImageUploadFromSession(data))

export function adminEventsRouteStateCreate(
  listOptions?: () => {
    readonly archiveOnly?: boolean
    readonly eventKey?: string
  },
) {
  const data = adminRoute.useLoaderData()
  const auth = eventorenAuthContextUse()
  const liveEvents = queryPaginatedCreate(
    api.catalog.catalogEventListAdminPageQuery,
    () => (data().authorized ? (listOptions?.() ?? {}) : undefined),
    { pageSize: 50, allPages: true },
  )
  const liveEventsResult = liveEvents.result
  const categoriesResult = queryCreate(api.catalog.catalogCategoryListQuery, () => (data().authorized ? {} : undefined))
  const hiddenCategoriesResult = queryCreate(api.catalog.catalogCategoryHiddenListQuery, () =>
    data().authorized ? {} : undefined,
  )
  const eventUpsert = mutationCreate(api.catalog.catalogEventUpsertMutation)
  const ticketTierUpsert = mutationCreate(api.catalog.catalogTicketTierUpsertMutation)
  const ticketTierDelete = mutationCreate(api.catalog.catalogTicketTierDeleteMutation)
  const eventPublish = mutationCreate(api.catalog.catalogEventPublishMutation)
  const eventDelete = mutationCreate(api.catalog.catalogEventDeleteMutation)
  const categoryCreate = mutationCreate(api.catalog.catalogCategoryCreateMutation)
  const categoryHide = mutationCreate(api.catalog.catalogCategoryHideMutation)
  const eventsResultGet = () => {
    const live = liveEventsResult()
    if (live) return live
    const routeData = data()
    if (listOptions) return undefined
    return isServerAuthorized() ? (routeData.authorized ? routeData.eventsResult : undefined) : undefined
  }
  const isServerAuthorized = () => data().authorized && (!auth.ready() || !!auth.token())
  const categoryListResultGet = () => categoriesResult()
  const hiddenCategoryListResultGet = () => hiddenCategoriesResult()

  return adminCatalogPageStateCreate({
    isLoading: () => liveEventsResult() === undefined || liveEvents.isLoading(),
    isDone: liveEvents.isDone,
    eventsError: () => {
      const result = liveEventsResult()
      return result && !result.success ? "Admin-Veranstaltungen konnten nicht geladen werden." : ""
    },
    events: () => {
      const result = eventsResultGet()
      return result?.success && "data" in result ? result.data : []
    },
    eventsLive: () => {
      const result = liveEventsResult()
      return result?.success ? result.data : listOptions ? [] : undefined
    },
    eventsLoadError: () => {
      const result = eventsResultGet()
      return result && !result.success ? "Admin-Veranstaltungen konnten nicht geladen werden." : ""
    },
    isServerAuthorized,
    categoryLive: categoryListResultGet,
    categoryHiddenLive: hiddenCategoryListResultGet,
    reloadEvents: async () => {
      const result = liveEventsResult()
      if (result?.success) return result
      return result ?? createResultError("adminEventsRouteStateCreate", "Admin-Veranstaltungen werden geladen.")
    },
    eventUpsert,
    ticketTierDelete,
    ticketTierUpsert,
    eventPublish,
    eventDelete,
    categoryHiddenList: async () =>
      hiddenCategoriesResult() ?? createResultError("adminEventsRouteStateCreate", "Kategorien werden geladen."),
    categoryList: async () =>
      categoriesResult() ?? createResultError("adminEventsRouteStateCreate", "Kategorien werden geladen."),
    categoryCreate,
    categoryHide,
    imageUpload: (file) => {
      const data = new FormData()
      data.set("file", file)
      return uploadAdminImage({ data })
    },
  })
}
