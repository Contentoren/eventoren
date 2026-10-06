import { createEffect } from "solid-js"
import { api } from "#convex/_generated/api.js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { AdminEventItem } from "#src/admin/AdminEventItem.ts"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { scannerLinkAdminServerCreate } from "./scannerLinkAdminServerCreate.ts"

type Source = ReturnType<typeof scannerLinkAdminServerCreate>
type Page = { page: Doc<"scannerLinks">[]; continueCursor: string; isDone: boolean }
const pageSize = 25

export function adminScannerLinksStateCreate(
  eventsResult: () =>
    | { readonly success: true; readonly data: readonly AdminEventItem[] }
    | { readonly success: false; readonly errorMessage: string },
  source?: Source,
) {
  const selectedParent = createSignalObject<Id<"scannerLinks"> | null>(null)
  const liveOrganizers = queryPaginatedCreate(
    api.scannerLinks.scannerLinkAdminListQuery,
    () => (source ? undefined : {}),
    { pageSize },
  )
  const liveHelpers = queryPaginatedCreate(
    api.scannerLinks.scannerLinkAdminHelperListQuery,
    () => {
      const parentId = selectedParent.get()
      return source || !parentId ? undefined : { parentId }
    },
    { pageSize },
  )
  const organizerCreateMutation = mutationCreate(api.scannerLinks.scannerLinkAdminCreateMutation)
  const helperCreateMutation = mutationCreate(api.scannerLinks.scannerLinkAdminHelperCreateMutation)
  const organizerRevokeMutation = mutationCreate(api.scannerLinks.scannerLinkAdminRevokeMutation)
  const helperRevokeMutation = mutationCreate(api.scannerLinks.scannerLinkAdminHelperRevokeMutation)
  const organizers = createSignalObject<Doc<"scannerLinks">[]>([])
  const helpers = createSignalObject<Doc<"scannerLinks">[]>([])
  const helperCursor = createSignalObject<string | null>(null)
  const helperDone = createSignalObject(false)
  const loading = createSignalObject(false)
  const helperLoading = createSignalObject(false)
  const pending = createSignalObject(false)
  const error = createSignalObject("")
  const organizerName = createSignalObject("")
  const organizerEvents = createSignalObject<string[]>([])
  const organizerExpiry = createSignalObject("")
  const helperName = createSignalObject("")
  const helperEvents = createSignalObject<string[]>([])
  const helperExpiry = createSignalObject("")
  let helperRequest = 0
  const publishedEvents = () =>
    eventsResult().success
      ? (eventsResult() as { success: true; data: readonly AdminEventItem[] }).data.filter(
          (event) => event.status === "published",
        )
      : []
  const parent = () => organizers.get().find((link) => link._id === selectedParent.get())
  const availableEvents = () =>
    selectedParent.get()
      ? publishedEvents().filter((event) => parent()?.eventKeys.includes(event.id))
      : publishedEvents()
  const maxExpiry = (parentExpiry?: number) => {
    const limit = Math.min(parentExpiry ?? Infinity, Date.now() + 365 * 86400000)
    const date = new Date(limit)
    return new Date(limit - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }
  const validate = (
    name: string,
    keys: string[],
    expiry: string,
    allowed: readonly AdminEventItem[],
    parentExpiry?: number,
  ) => {
    const expiresAt = new Date(expiry).getTime()
    if (
      !name.trim() ||
      name.trim().length > 120 ||
      keys.length < 1 ||
      keys.length > 50 ||
      new Set(keys).size !== keys.length ||
      keys.some((key) => !allowed.some((event) => event.id === key)) ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > Date.now() + 365 * 86400000 ||
      (parentExpiry !== undefined && expiresAt > parentExpiry)
    ) {
      error.set(
        "Bitte einen Namen, 1–50 erlaubte Events und ein gültiges Ablaufdatum (maximal ein Jahr, Helfer nicht nach dem Veranstalterlink) angeben.",
      )
      return null
    }
    return expiresAt
  }
  const loadOrganizers = async (cursor: string | null = null) => {
    if (!source) {
      if (cursor !== null) liveOrganizers.loadMore()
      return
    }
    if (loading.get()) return
    loading.set(true)
    error.set("")
    try {
      const result = await source.organizerList({ data: { paginationOpts: { numItems: pageSize, cursor } } })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const page = result.data as Page
      organizers.set(cursor ? [...organizers.get(), ...page.page] : page.page)
      organizerDone.set(page.isDone)
      organizerCursor.set(page.continueCursor)
    } catch {
      error.set("Veranstalterlinks konnten nicht geladen werden.")
    } finally {
      loading.set(false)
    }
  }
  const loadHelpers = async (cursor: string | null = null) => {
    if (!source) {
      if (cursor !== null) liveHelpers.loadMore()
      return
    }
    const parentId = selectedParent.get()
    if (!parentId) return
    const request = ++helperRequest
    helperLoading.set(true)
    error.set("")
    try {
      const result = await source.helperList({ data: { parentId, paginationOpts: { numItems: pageSize, cursor } } })
      if (selectedParent.get() !== parentId || request !== helperRequest) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const page = result.data as Page
      helpers.set(cursor ? [...helpers.get(), ...page.page] : page.page)
      helperDone.set(page.isDone)
      helperCursor.set(page.continueCursor)
    } catch {
      if (request === helperRequest) error.set("Helferlinks konnten nicht geladen werden.")
    } finally {
      if (request === helperRequest) helperLoading.set(false)
    }
  }
  const selectParent = (id: Id<"scannerLinks">) => {
    selectedParent.set(id)
    helpers.set([])
    helperCursor.set(null)
    helperDone.set(false)
    helperEvents.set([])
    if (source) void loadHelpers()
  }
  const createOrganizer = async () => {
    if (pending.get()) return
    error.set("")
    const expiresAt = validate(organizerName.get(), organizerEvents.get(), organizerExpiry.get(), publishedEvents())
    if (expiresAt === null) return
    pending.set(true)
    try {
      const result = source
        ? await source.organizerCreate({
            data: { name: organizerName.get().trim(), eventKeys: organizerEvents.get(), expiresAt },
          })
        : await organizerCreateMutation({
            name: organizerName.get().trim(),
            eventKeys: organizerEvents.get(),
            expiresAt,
          })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      organizerName.set("")
      organizerEvents.set([])
      organizerExpiry.set("")
      await loadOrganizers()
    } catch {
      error.set("Veranstalterlink konnte nicht erstellt werden.")
    } finally {
      pending.set(false)
    }
  }
  const createHelper = async () => {
    const current = parent()
    if (!current || current.revokedAt || current.expiresAt <= Date.now() || pending.get()) return
    error.set("")
    const expiresAt = validate(
      helperName.get(),
      helperEvents.get(),
      helperExpiry.get(),
      availableEvents(),
      current.expiresAt,
    )
    if (expiresAt === null) return
    pending.set(true)
    try {
      const result = source
        ? await source.helperCreate({
            data: { parentId: current._id, name: helperName.get().trim(), eventKeys: helperEvents.get(), expiresAt },
          })
        : await helperCreateMutation({
            parentId: current._id,
            name: helperName.get().trim(),
            eventKeys: helperEvents.get(),
            expiresAt,
          })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      helperName.set("")
      helperEvents.set([])
      helperExpiry.set("")
      await loadHelpers()
    } catch {
      error.set("Helferlink konnte nicht erstellt werden.")
    } finally {
      pending.set(false)
    }
  }
  const revoke = async (link: Doc<"scannerLinks">) => {
    if (pending.get() || link.revokedAt) return
    pending.set(true)
    error.set("")
    try {
      const result = source
        ? link.role === "organizer"
          ? await source.organizerRevoke({ data: { id: link._id } })
          : await source.helperRevoke({ data: { id: link._id } })
        : link.role === "organizer"
          ? await organizerRevokeMutation({ id: link._id })
          : await helperRevokeMutation({ id: link._id })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const mark = (item: Doc<"scannerLinks">) => (item._id === link._id ? { ...item, revokedAt: Date.now() } : item)
      if (source) {
        if (link.role === "organizer") organizers.set(organizers.get().map(mark))
        else helpers.set(helpers.get().map(mark))
      }
    } catch {
      error.set("Link konnte nicht widerrufen werden.")
    } finally {
      pending.set(false)
    }
  }
  const organizerCursor = createSignalObject<string | null>(null)
  const organizerDone = createSignalObject(false)
  const organizerItems = () => {
    if (source) return organizers.get()
    const result = liveOrganizers.result()
    return result?.success ? [...result.data] : []
  }
  const helperItems = () => {
    if (source) return helpers.get()
    const result = liveHelpers.result()
    return result?.success ? [...result.data] : []
  }
  const syncNativeError = () => {
    if (source) return
    const organizerResult = liveOrganizers.result()
    const helperResult = liveHelpers.result()
    const failure = [organizerResult, helperResult].find((item) => item && !item.success)
    if (failure && !failure.success) error.set(failure.errorMessage)
  }
  createEffect(syncNativeError)
  // Keep live query errors visible without turning the list into a one-shot request.
  const organizerList = () => {
    return organizerItems()
  }
  const helperList = () => {
    return helperItems()
  }
  const isOrganizerLoading = () => (source ? loading.get() : liveOrganizers.isLoading())
  const isHelperLoading = () => (source ? helperLoading.get() : !!selectedParent.get() && liveHelpers.isLoading())
  return {
    organizers: organizerList,
    helpers: helperList,
    parent: () => organizerItems().find((link) => link._id === selectedParent.get()),
    selectedParent: selectedParent.get,
    organizerName,
    organizerEvents,
    organizerExpiry,
    helperName,
    helperEvents,
    helperExpiry,
    publishedEvents,
    availableEvents,
    maxExpiry,
    loading: isOrganizerLoading,
    helperLoading: isHelperLoading,
    pending: pending.get,
    error: error.get,
    organizerHasMore: () => (source ? !organizerDone.get() : !liveOrganizers.isDone()),
    helperHasMore: () => (source ? !helperDone.get() : !!selectedParent.get() && !liveHelpers.isDone()),
    loadOrganizers,
    loadMoreOrganizers: () => (source ? loadOrganizers(organizerCursor.get()) : liveOrganizers.loadMore()),
    loadMoreHelpers: () => (source ? loadHelpers(helperCursor.get()) : liveHelpers.loadMore()),
    selectParent,
    createOrganizer,
    createHelper,
    revoke,
  }
}
