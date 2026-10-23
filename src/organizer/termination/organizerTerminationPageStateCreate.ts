import { createEffect, onCleanup, onMount, useContext } from "solid-js"
import * as v from "valibot"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { convexClientContext } from "#src/utils/convex_client/convexClientContext.ts"
import { api } from "#convex/_generated/api.js"
import type { FunctionReturnType } from "convex/server"
import {
  organizerTerminationRequestSchema,
  type OrganizerTerminationRequest,
} from "./organizerTerminationRequestSchema.ts"
import { organizerTerminationDeclarationCreate } from "./organizerTerminationDeclarationCreate.ts"
import { organizerTerminationReceiptSchema } from "./organizerTerminationReceiptSchema.ts"
import { organizerTerminationDraftSchema } from "./organizerTerminationDraftSchema.ts"

export function organizerTerminationPageStateCreate() {
  const client = useContext(convexClientContext)
  const draft = createSignalObject<OrganizerTerminationRequest>({
    kind: "widerruf",
    legalName: "",
    email: "",
    contractReference: "",
    requestKey: "",
    receiptToken: "",
  })
  const review = createSignalObject(false)
  const submitted = createSignalObject(false)
  const busy = createSignalObject(false)
  const error = createSignalObject("")
  const receipt =
    createSignalObject<FunctionReturnType<typeof api.organizerTermination.organizerTerminationReceiptQuery>>(null)
  const storageKey = "eventoren.organizerTermination.draft"
  let saveTimer: ReturnType<typeof setTimeout> | undefined
  const secret = () =>
    Array.from(crypto.getRandomValues(new Uint8Array(32)), (byte) => byte.toString(16).padStart(2, "0")).join("")
  onMount(() => {
    draft.set({ ...draft.get(), requestKey: secret(), receiptToken: secret() })
    try {
      const stored = localStorage.getItem(storageKey)
      if (stored) {
        const parsed = v.safeParse(organizerTerminationDraftSchema, JSON.parse(stored))
        if (parsed.success) draft.set(parsed.output)
      }
      const storedReceipt = sessionStorage.getItem("eventoren.organizerTermination.receipt")
      if (storedReceipt) {
        const parsed = v.safeParse(organizerTerminationReceiptSchema, JSON.parse(storedReceipt))
        if (parsed.success) draft.set({ ...draft.get(), ...parsed.output })
      }
    } catch {
      /* Storage is optional; never block a legal declaration. */
    }
  })
  createEffect(() => {
    const input = draft.get()
    const done = submitted.get()
    clearTimeout(saveTimer)
    if (!input.requestKey || done) return
    saveTimer = setTimeout(() => {
      const save = () => {
        try {
          localStorage.setItem(storageKey, JSON.stringify(input))
        } catch {
          /* optional */
        }
      }
      if ("requestIdleCallback" in window) window.requestIdleCallback(save)
      else save()
    }, 250)
  })
  createEffect(() => {
    const input = draft.get()
    if (!client || !input.requestKey) return
    const unsubscribe = client.onUpdate(
      api.organizerTermination.organizerTerminationReceiptQuery,
      { requestKey: input.requestKey, receiptToken: input.receiptToken },
      (value) => {
        receipt.set(value)
        if (value) submitted.set(true)
      },
      () => error.set("Empfangsbeleg derzeit nicht abrufbar. Bitte erneut versuchen."),
    )
    onCleanup(unsubscribe)
  })
  onCleanup(() => clearTimeout(saveTimer))
  const update = (key: keyof OrganizerTerminationRequest, value: string) => {
    review.set(false)
    error.set("")
    if (key === "kind") {
      draft.set({
        ...draft.get(),
        kind: value === "kuendigung" ? "kuendigung" : "widerruf",
        requestedDate: undefined,
        extraordinaryReason: undefined,
      })
      return
    }
    draft.set({
      ...draft.get(),
      [key]: key === "requestedDate" || key === "extraordinaryReason" ? value || undefined : value,
    })
  }
  const preview = (event: SubmitEvent) => {
    event.preventDefault()
    const parsed = v.safeParse(organizerTerminationRequestSchema, draft.get())
    if (!parsed.success) {
      error.set(v.summarize(parsed.issues))
      return
    }
    draft.set(parsed.output)
    review.set(true)
  }
  const submit = async () => {
    if (!client || busy.get() || !review.get()) {
      if (!client) error.set("Verbindung nicht verfügbar. Bitte später erneut versuchen.")
      return
    }
    busy.set(true)
    error.set("")
    try {
      const result = await client.mutation(api.organizerTermination.organizerTerminationSubmitMutation, draft.get())
      if (!result.success) {
        error.set(result.errorMessage)
        return
      }
      submitted.set(true)
      clearTimeout(saveTimer)
      // Keep only receipt credentials, not form PII, after success.
      try {
        localStorage.removeItem(storageKey)
        sessionStorage.setItem("eventoren.organizerTermination.receipt", JSON.stringify(result.data))
      } catch {
        /* optional */
      }
    } catch {
      error.set("Übermittlung nicht bestätigt. Bitte dieselbe Erklärung erneut senden (keine doppelte Erfassung).")
    } finally {
      busy.set(false)
    }
  }
  const retry = async () => {
    if (!client || busy.get()) return
    busy.set(true)
    try {
      const result = await client.mutation(api.organizerTermination.organizerTerminationRetryMutation, {
        requestKey: draft.get().requestKey,
        receiptToken: draft.get().receiptToken,
      })
      if (!result.success) error.set(result.errorMessage)
    } catch {
      error.set("Erneuter E-Mail-Versand derzeit nicht möglich.")
    } finally {
      busy.set(false)
    }
  }
  return {
    draft: draft.get,
    review: review.get,
    submitted: submitted.get,
    busy: busy.get,
    error: error.get,
    receipt: receipt.get,
    update,
    preview,
    submit,
    retry,
    edit: () => review.set(false),
    declaration: () => organizerTerminationDeclarationCreate(draft.get()),
    receivedAt: () =>
      receipt.get()
        ? new Intl.DateTimeFormat("de-DE", { timeZone: "Europe/Berlin", dateStyle: "full", timeStyle: "long" }).format(
            new Date(receipt.get()!.receivedAt),
          )
        : "",
  }
}
