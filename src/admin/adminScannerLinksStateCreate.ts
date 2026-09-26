import { onMount } from "solid-js"
import type { Doc, Id } from "#convex/_generated/dataModel.js"
import type { AdminEventItem } from "#src/admin/AdminEventItem.ts"
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
  const transport = async () =>
    source ?? (await import("./scannerLinkAdminServerCreate.ts")).scannerLinkAdminServerCreate()
  const organizers = createSignalObject<Doc<"scannerLinks">[]>([])
  const helpers = createSignalObject<Doc<"scannerLinks">[]>([])
  const selectedParent = createSignalObject<Id<"scannerLinks"> | null>(null)
  const organizerCursor = createSignalObject<string | null>(null)
  const helperCursor = createSignalObject<string | null>(null)
  const organizerDone = createSignalObject(false)
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
    if (loading.get()) return
    loading.set(true)
    error.set("")
    try {
      const result = await (await transport()).organizerList({
        data: { paginationOpts: { numItems: pageSize, cursor } },
      })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const page = result.data as Page
      organizers.set(cursor ? [...organizers.get(), ...page.page] : page.page)
      organizerCursor.set(page.continueCursor)
      organizerDone.set(page.isDone)
    } catch {
      error.set("Veranstalterlinks konnten nicht geladen werden.")
    } finally {
      loading.set(false)
    }
  }
  const loadHelpers = async (cursor: string | null = null) => {
    const parentId = selectedParent.get()
    if (!parentId) return
    const request = ++helperRequest
    helperLoading.set(true)
    error.set("")
    try {
      const result = await (await transport()).helperList({
        data: { parentId, paginationOpts: { numItems: pageSize, cursor } },
      })
      if (selectedParent.get() !== parentId || request !== helperRequest) return
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const page = result.data as Page
      helpers.set(cursor ? [...helpers.get(), ...page.page] : page.page)
      helperCursor.set(page.continueCursor)
      helperDone.set(page.isDone)
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
    void loadHelpers()
  }
  const createOrganizer = async () => {
    if (pending.get()) return
    error.set("")
    const expiresAt = validate(organizerName.get(), organizerEvents.get(), organizerExpiry.get(), publishedEvents())
    if (expiresAt === null) return
    pending.set(true)
    try {
      const result = await (await transport()).organizerCreate({
        data: { name: organizerName.get().trim(), eventKeys: organizerEvents.get(), expiresAt },
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
      const result = await (await transport()).helperCreate({
        data: { parentId: current._id, name: helperName.get().trim(), eventKeys: helperEvents.get(), expiresAt },
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
      const server = await transport()
      const result =
        link.role === "organizer"
          ? await server.organizerRevoke({ data: { id: link._id } })
          : await server.helperRevoke({ data: { id: link._id } })
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      const mark = (item: Doc<"scannerLinks">) => (item._id === link._id ? { ...item, revokedAt: Date.now() } : item)
      if (link.role === "organizer") organizers.set(organizers.get().map(mark))
      else helpers.set(helpers.get().map(mark))
    } catch {
      error.set("Link konnte nicht widerrufen werden.")
    } finally {
      pending.set(false)
    }
  }
  onMount(() => void loadOrganizers())
  return {
    organizers: organizers.get,
    helpers: helpers.get,
    parent,
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
    loading: loading.get,
    helperLoading: helperLoading.get,
    pending: pending.get,
    error: error.get,
    organizerHasMore: () => !organizerDone.get(),
    helperHasMore: () => !helperDone.get(),
    loadOrganizers,
    loadMoreOrganizers: () => loadOrganizers(organizerCursor.get()),
    loadMoreHelpers: () => loadHelpers(helperCursor.get()),
    selectParent,
    createOrganizer,
    createHelper,
    revoke,
  }
}
