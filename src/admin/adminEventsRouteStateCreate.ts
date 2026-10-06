import { getRouteApi } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { eventorenAuthContextUse } from "#src/auth/ui/eventorenAuthContextUse.ts"
import { api } from "#convex/_generated/api.js"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { queryCreate } from "#src/utils/convex_client/queryCreate.ts"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { createResultError } from "#result"
import { adminImageUploadFromSession } from "#src/server/adminImageUploadFromSession.ts"
import { adminCatalogPageStateCreate } from "./adminCatalogPageStateCreate.ts"

const adminRoute = getRouteApi("/admin")
const uploadAdminImage = createServerFn({ method: "POST" })
  .validator((data: FormData) => data)
  .handler(({ data }) => adminImageUploadFromSession(data))

export function adminEventsRouteStateCreate() {
  const data = adminRoute.useLoaderData()
  const auth = eventorenAuthContextUse()
  const liveEvents = queryPaginatedCreate(
    api.catalog.catalogEventListAdminPageQuery,
    () => (data().authorized ? {} : undefined),
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
    return isServerAuthorized() ? (routeData.authorized ? routeData.eventsResult : undefined) : undefined
  }
  const isServerAuthorized = () => data().authorized && (!auth.ready() || !!auth.token())
  const categoryListResultGet = () => categoriesResult()
  const hiddenCategoryListResultGet = () => hiddenCategoriesResult()

  return adminCatalogPageStateCreate({
    events: () => {
      const result = eventsResultGet()
      return result?.success ? result.data : []
    },
    eventsLive: () => {
      const result = liveEventsResult()
      return result?.success ? result.data : undefined
    },
    eventsLoadError: () => {
      const result = eventsResultGet()
      return result && !result.success ? result.errorMessage : ""
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
