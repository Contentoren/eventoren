import { onMount } from "solid-js"
import type { Doc } from "#convex/_generated/dataModel.js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { scannerLinkDataSourceLiveCreate } from "./scannerLinkDataSourceLiveCreate.ts"
import { scannerLinkErrorMessageGet } from "./scannerLinkErrorMessageGet.ts"

export function scannerHelperManagementStateCreate(
  code: () => string,
  source = scannerLinkDataSourceLiveCreate(code()),
) {
  const context = createSignalObject<{
    name: string
    role: "organizer" | "helper"
    expiresAt: number
    events: { eventKey: string; title: string }[]
  } | null>(null)
  const helpers = createSignalObject<Doc<"scannerLinks">[]>([])
  const cursor = createSignalObject<string | null>(null)
  const done = createSignalObject(false)
  const loading = createSignalObject(true)
  const listing = createSignalObject(false)
  const pending = createSignalObject(false)
  const error = createSignalObject("")
  const actionError = createSignalObject("")
  const name = createSignalObject("")
  const selectedEvents = createSignalObject<string[]>([])
  const expiry = createSignalObject("")
  const active = () => context.get()?.role === "organizer" && (context.get()?.expiresAt ?? 0) > Date.now()
  const maxExpiry = () => {
    const limit = Math.min(context.get()?.expiresAt ?? 0, Date.now() + 365 * 86400000)
    const date = new Date(limit)
    return new Date(limit - date.getTimezoneOffset() * 60000).toISOString().slice(0, 16)
  }

  const loadPage = async (next: string | null) => {
    if (listing.get()) return
    listing.set(true)
    actionError.set("")
    try {
      const result = await source.helperList({ numItems: 25, cursor: next })
      if (!result.success) {
        context.set(null)
        error.set(scannerLinkErrorMessageGet(result.errorMessage))
        return
      }
      helpers.set(next ? [...helpers.get(), ...result.data.page] : result.data.page)
      cursor.set(result.data.continueCursor)
      done.set(result.data.isDone)
    } catch {
      actionError.set("Helferlinks konnten nicht geladen werden. Bitte erneut versuchen.")
    } finally {
      listing.set(false)
    }
  }

  const reload = async () => {
    loading.set(true)
    error.set("")
    context.set(null)
    try {
      const result = await source.linkContext()
      if (!result.success) {
        error.set(scannerLinkErrorMessageGet(result.errorMessage))
        return
      }
      context.set(result.data)
      if (result.data.role === "organizer" && result.data.expiresAt > Date.now()) await loadPage(null)
    } catch {
      error.set(scannerLinkErrorMessageGet(""))
    } finally {
      loading.set(false)
    }
  }
  onMount(() => void reload())

  const create = async () => {
    if (!active() || pending.get()) return
    actionError.set("")
    const expiresAt = new Date(expiry.get()).getTime()
    if (
      !name.get().trim() ||
      name.get().trim().length > 120 ||
      selectedEvents.get().length === 0 ||
      selectedEvents.get().some((key) => !context.get()?.events.some((event) => event.eventKey === key)) ||
      !Number.isSafeInteger(expiresAt) ||
      expiresAt <= Date.now() ||
      expiresAt > (context.get()?.expiresAt ?? 0) ||
      expiresAt > Date.now() + 365 * 86400000
    ) {
      actionError.set(
        "Bitte Namen, mindestens ein erlaubtes Event und ein gültiges Ablaufdatum angeben (maximal ein Jahr und nicht nach dem Veranstalterlink).",
      )
      return
    }
    pending.set(true)
    try {
      const result = await source.helperCreate(name.get().trim(), selectedEvents.get(), expiresAt)
      if (!result.success) {
        actionError.set(result.errorMessage)
        return
      }
      name.set("")
      expiry.set("")
      selectedEvents.set([])
      await loadPage(null)
    } catch {
      actionError.set("Helferlink konnte nicht erstellt werden. Bitte erneut versuchen.")
    } finally {
      pending.set(false)
    }
  }

  const revoke = async (link: Doc<"scannerLinks">) => {
    if (!active() || pending.get() || link.revokedAt) return
    pending.set(true)
    actionError.set("")
    try {
      const result = await source.helperRevoke(link._id)
      if (!result.success) {
        actionError.set(result.errorMessage)
        return
      }
      helpers.set(helpers.get().map((item) => (item._id === link._id ? { ...item, revokedAt: Date.now() } : item)))
    } catch {
      actionError.set("Helferlink konnte nicht widerrufen werden. Bitte erneut versuchen.")
    } finally {
      pending.set(false)
    }
  }

  return {
    context: context.get,
    helpers: helpers.get,
    loading: loading.get,
    listing: listing.get,
    pending: pending.get,
    error: error.get,
    actionError: actionError.get,
    name,
    selectedEvents,
    expiry,
    active,
    maxExpiry,
    hasMore: () => !done.get(),
    loadMore: () => loadPage(cursor.get()),
    reload,
    create,
    revoke,
  }
}
