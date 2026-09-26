import { createServerFn } from "@tanstack/solid-start"
import { getRequestHeader } from "@tanstack/solid-start/server"
import type { FunctionArgs } from "convex/server"
import { api } from "#convex/_generated/api.js"
import { createResultError } from "#result"
import { apiClientCreate } from "#src/client/apiClient.ts"
import { adminSessionTokenRead } from "#src/server/adminSessionTokenRead.ts"
import { convexUrlGet } from "#src/server/convexUrlGet.ts"
import { scannerLinkAdminBackendFailureGet } from "./scannerLinkAdminBackendFailureGet.ts"

type OrganizerCreate = Omit<FunctionArgs<typeof api.scannerLinks.scannerLinkAdminCreateMutation>, "token">
type OrganizerList = Omit<FunctionArgs<typeof api.scannerLinks.scannerLinkAdminListQuery>, "token">
type OrganizerRevoke = Omit<FunctionArgs<typeof api.scannerLinks.scannerLinkAdminRevokeMutation>, "token">
type HelperCreate = Omit<FunctionArgs<typeof api.scannerLinks.scannerLinkAdminHelperCreateMutation>, "token">
type HelperList = Omit<FunctionArgs<typeof api.scannerLinks.scannerLinkAdminHelperListQuery>, "token">
type HelperRevoke = Omit<FunctionArgs<typeof api.scannerLinks.scannerLinkAdminHelperRevokeMutation>, "token">

// The browser never supplies a Convex token; every invocation reads the current same-origin session.
const organizerCreate = createServerFn({ method: "POST" })
  .validator((data: OrganizerCreate) => data)
  .handler(async ({ data }) => {
    const token = adminSessionTokenRead(getRequestHeader("cookie"))
    if (!token.success) return createResultError("scannerLinkAdminCreate", token.errorMessage)
    try {
      return await apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkAdminCreateMutation, {
        ...data,
        token: token.data,
      })
    } catch (error) {
      return scannerLinkAdminBackendFailureGet("scannerLinkAdminCreate", error)
    }
  })
const organizerList = createServerFn({ method: "POST" })
  .validator((data: OrganizerList) => data)
  .handler(async ({ data }) => {
    const token = adminSessionTokenRead(getRequestHeader("cookie"))
    if (!token.success) return createResultError("scannerLinkAdminList", token.errorMessage)
    try {
      return await apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkAdminListQuery, {
        ...data,
        token: token.data,
      })
    } catch (error) {
      return scannerLinkAdminBackendFailureGet("scannerLinkAdminList", error)
    }
  })
const organizerRevoke = createServerFn({ method: "POST" })
  .validator((data: OrganizerRevoke) => data)
  .handler(async ({ data }) => {
    const token = adminSessionTokenRead(getRequestHeader("cookie"))
    if (!token.success) return createResultError("scannerLinkAdminRevoke", token.errorMessage)
    return apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkAdminRevokeMutation, {
      ...data,
      token: token.data,
    })
  })
const helperCreate = createServerFn({ method: "POST" })
  .validator((data: HelperCreate) => data)
  .handler(async ({ data }) => {
    const token = adminSessionTokenRead(getRequestHeader("cookie"))
    if (!token.success) return createResultError("scannerLinkAdminHelperCreate", token.errorMessage)
    return apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkAdminHelperCreateMutation, {
      ...data,
      token: token.data,
    })
  })
const helperList = createServerFn({ method: "POST" })
  .validator((data: HelperList) => data)
  .handler(async ({ data }) => {
    const token = adminSessionTokenRead(getRequestHeader("cookie"))
    if (!token.success) return createResultError("scannerLinkAdminHelperList", token.errorMessage)
    return apiClientCreate(convexUrlGet()).query(api.scannerLinks.scannerLinkAdminHelperListQuery, {
      ...data,
      token: token.data,
    })
  })
const helperRevoke = createServerFn({ method: "POST" })
  .validator((data: HelperRevoke) => data)
  .handler(async ({ data }) => {
    const token = adminSessionTokenRead(getRequestHeader("cookie"))
    if (!token.success) return createResultError("scannerLinkAdminHelperRevoke", token.errorMessage)
    return apiClientCreate(convexUrlGet()).mutation(api.scannerLinks.scannerLinkAdminHelperRevokeMutation, {
      ...data,
      token: token.data,
    })
  })

export function scannerLinkAdminServerCreate() {
  return { organizerCreate, organizerList, organizerRevoke, helperCreate, helperList, helperRevoke }
}
