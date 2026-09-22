import { getRouteApi } from "@tanstack/solid-router"
import { createServerFn } from "@tanstack/solid-start"
import { catalogCategoryHiddenListFromSession } from "#src/server/catalogCategoryHiddenListFromSession.ts"
import { catalogCategoryHideFromSession } from "#src/server/catalogCategoryHideFromSession.ts"
import { catalogEventPublishFromSession } from "#src/server/catalogEventPublishFromSession.ts"
import { catalogEventsAdminGet } from "#src/server/catalogEventsAdminGet.ts"
import { catalogEventUpsertFromSession } from "#src/server/catalogEventUpsertFromSession.ts"
import { catalogTicketTierDeleteFromSession } from "#src/server/catalogTicketTierDeleteFromSession.ts"
import { catalogTicketTierUpsertFromSession } from "#src/server/catalogTicketTierUpsertFromSession.ts"
import { adminCatalogPageStateCreate } from "./adminCatalogPageStateCreate.ts"

const adminRoute = getRouteApi("/admin")
const reloadAdminEvents = createServerFn({ method: "GET" }).handler(catalogEventsAdminGet)
const saveAdminEvent = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof catalogEventUpsertFromSession>[0]) => input)
  .handler(({ data }) => catalogEventUpsertFromSession(data))
const saveAdminTicketTier = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof catalogTicketTierUpsertFromSession>[0]) => input)
  .handler(({ data }) => catalogTicketTierUpsertFromSession(data))
const deleteAdminTicketTier = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof catalogTicketTierDeleteFromSession>[0]) => input)
  .handler(({ data }) => catalogTicketTierDeleteFromSession(data))
const publishAdminEvent = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof catalogEventPublishFromSession>[0]) => input)
  .handler(({ data }) => catalogEventPublishFromSession(data))
const getHiddenAdminCategories = createServerFn({ method: "GET" }).handler(catalogCategoryHiddenListFromSession)
const hideAdminCategory = createServerFn({ method: "POST" })
  .validator((input: Parameters<typeof catalogCategoryHideFromSession>[0]) => input)
  .handler(({ data }) => catalogCategoryHideFromSession(data))

export function adminEventsRouteStateCreate() {
  const data = adminRoute.useLoaderData()
  const eventsResultGet = () => {
    const routeData = data()
    return routeData.authorized ? routeData.eventsResult : undefined
  }

  return adminCatalogPageStateCreate({
    events: () => {
      const result = eventsResultGet()
      return result?.success ? result.data : []
    },
    eventsLoadError: () => {
      const result = eventsResultGet()
      return result && !result.success ? result.errorMessage : ""
    },
    isServerAuthorized: () => data().authorized,
    reloadEvents: () => reloadAdminEvents(),
    eventUpsert: (input) => saveAdminEvent({ data: input }),
    ticketTierDelete: (input) => deleteAdminTicketTier({ data: input }),
    ticketTierUpsert: (input) => saveAdminTicketTier({ data: input }),
    eventPublish: (input) => publishAdminEvent({ data: input }),
    categoryHiddenList: () => getHiddenAdminCategories(),
    categoryHide: (input) => hideAdminCategory({ data: input }),
  })
}
