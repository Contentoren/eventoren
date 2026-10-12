import { createMemo, onCleanup, onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { eventImageUrlGet } from "../events/eventImageUrlGet.ts"
import type { AdminCatalogPageState } from "./AdminCatalogPageState.ts"
import type { AdminEventDraft } from "./AdminEventDraft.ts"
import { adminCategoryPickerStateCreate } from "./adminCategoryPickerStateCreate.ts"
import { adminDateTimeIsoFromLocal } from "./adminDateTimeIsoFromLocal.ts"
import { adminDateTimeLocalFromIso } from "./adminDateTimeLocalFromIso.ts"

export function adminEventDetailsFormStateCreate(inputs: {
  catalog: AdminCatalogPageState
  onSaved?: (eventKey: string) => void | Promise<void>
}) {
  const validationMessage = createSignalObject("")
  const hydrated = createSignalObject(false)
  onMount(() => hydrated.set(true))
  const categoryPicker = adminCategoryPickerStateCreate({ catalog: inputs.catalog })
  const statusSignal = {
    get: () => inputs.catalog.eventDraft().status,
    set: (value: string) => inputs.catalog.eventFieldChange("status", value as AdminEventDraft["status"]),
  }
  const canPublish = createMemo(() => Boolean(inputs.catalog.selectedEventKey()))
  const imageUploading = createSignalObject(false)
  const imageUploadError = createSignalObject("")
  const imageDragActive = createSignalObject(false)
  const localPreviewUrl = createSignalObject("")
  let activeUploadPromise: Promise<void> | null = null

  const revokeLocalPreview = () => {
    const url = localPreviewUrl.get()
    if (!url) return
    localPreviewUrl.set("")
    try {
      if (typeof URL !== "undefined" && typeof URL.revokeObjectURL === "function") URL.revokeObjectURL(url)
    } catch {
      // Ignore revocation failures (e.g. test environments).
    }
  }
  onCleanup(revokeLocalPreview)

  const imagePreviewSource = createMemo(() => {
    const local = localPreviewUrl.get()
    if (local) return local
    const draft = inputs.catalog.eventDraft()
    if (!draft.imageUrl) return ""
    return eventImageUrlGet(draft.imageVariants?.detail ?? draft.imageUrl)
  })
  const imagePreview = createMemo(() => {
    const src = imagePreviewSource()
    if (!src) return undefined
    const failed = createSignalObject(false)
    return { src, failed: failed.get, onError: () => failed.set(true) }
  })
  const pendingAction = createSignalObject<"save" | "publish" | null>(null)
  let imageRequestRevision = 0

  const imageUrlChange = (value: string) => {
    imageRequestRevision += 1
    revokeLocalPreview()
    inputs.catalog.eventFieldChange("imageUrl", value)
    inputs.catalog.eventFieldChange("imageVariants", undefined)
  }

  const imageUpload = async (file?: File) => {
    if (!file || imageUploading.get()) return
    const eventKey = inputs.catalog.eventDraft().eventKey
    const draftRevision = inputs.catalog.eventDraftRevision()
    const requestRevision = ++imageRequestRevision
    const isCurrentUpload = () =>
      requestRevision === imageRequestRevision &&
      inputs.catalog.eventDraftRevision() === draftRevision &&
      (!eventKey || inputs.catalog.eventDraft().eventKey === eventKey)
    imageUploadError.set("")
    imageUploading.set(true)
    let previewUrlForRequest = ""
    try {
      if (typeof URL !== "undefined" && typeof URL.createObjectURL === "function") {
        try {
          previewUrlForRequest = URL.createObjectURL(file)
          if (typeof previewUrlForRequest === "string" && previewUrlForRequest)
            localPreviewUrl.set(previewUrlForRequest)
          else previewUrlForRequest = ""
        } catch {
          previewUrlForRequest = ""
        }
      }
    } catch {
      previewUrlForRequest = ""
    }
    const uploadTask = (async () => {
      try {
        if (!inputs.catalog.imageUpload) {
          if (isCurrentUpload())
            imageUploadError.set("Für den Bild-Upload ist eine gültige Admin-Sitzung erforderlich.")
          return
        }
        const result = await inputs.catalog.imageUpload(file)
        if (!result.success) {
          if (isCurrentUpload()) imageUploadError.set(result.errorMessage)
          return
        }
        if (!isCurrentUpload()) return
        inputs.catalog.eventFieldChange("imageUrl", result.data.detail)
        inputs.catalog.eventFieldChange("imageVariants", result.data)
      } catch {
        if (isCurrentUpload()) imageUploadError.set("Bild-Upload fehlgeschlagen. Bitte versuche es erneut.")
      } finally {
        if (previewUrlForRequest && localPreviewUrl.get() === previewUrlForRequest) revokeLocalPreview()
        imageUploading.set(false)
      }
    })()
    activeUploadPromise = uploadTask
    try {
      await uploadTask
    } finally {
      if (activeUploadPromise === uploadTask) activeUploadPromise = null
    }
  }

  const dateValue = (field: "startsAt" | "doorsAt" | "endsAt") =>
    adminDateTimeLocalFromIso(inputs.catalog.eventDraft()[field])

  const dateChange = (field: "startsAt" | "doorsAt" | "endsAt", value: string) => {
    const isoValue = adminDateTimeIsoFromLocal(value)
    if (isoValue === null) {
      validationMessage.set("Bitte gib ein gültiges Datum mit Uhrzeit ein.")
      return
    }
    validationMessage.set("")
    inputs.catalog.eventFieldChange(field, isoValue)
  }

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (pendingAction.get()) return
    validationMessage.set("")
    pendingAction.set("save")
    try {
      if (imageUploading.get() && activeUploadPromise) {
        await activeUploadPromise
        if (imageUploadError.get()) return
      }
      const eventKey = await inputs.catalog.saveEvent()
      if (eventKey) await inputs.onSaved?.(eventKey)
    } finally {
      pendingAction.set(null)
    }
  }

  const publish = async () => {
    if (pendingAction.get()) return
    pendingAction.set("publish")
    try {
      if (imageUploading.get() && activeUploadPromise) {
        await activeUploadPromise
        if (imageUploadError.get()) return
      }
      await inputs.catalog.publishEvent()
    } finally {
      pendingAction.set(null)
    }
  }

  return {
    categoryPicker,
    hydrated: hydrated.get,
    validationMessage: validationMessage.get,
    statusSignal,
    statusOptions: () => ["draft", "published", "archived"],
    statusLabel: (value: string) =>
      ({ draft: "Entwurf", published: "Veröffentlicht", archived: "Archiviert" })[value] ?? value,
    startsAt: () => dateValue("startsAt"),
    doorsAt: () => dateValue("doorsAt"),
    endsAt: () => dateValue("endsAt"),
    startsAtChange: (value: string) => dateChange("startsAt", value),
    doorsAtChange: (value: string) => dateChange("doorsAt", value),
    endsAtChange: (value: string) => dateChange("endsAt", value),
    imageUrlChange,
    imagePreview,
    imageUpload,
    imageUploading: imageUploading.get,
    imageUploadError: imageUploadError.get,
    imageDragActive: imageDragActive.get,
    imageDragStart: () => imageDragActive.set(true),
    imageDragEnd: () => imageDragActive.set(false),
    canPublish,
    pendingAction: pendingAction.get,
    submit,
    publish,
  }
}
