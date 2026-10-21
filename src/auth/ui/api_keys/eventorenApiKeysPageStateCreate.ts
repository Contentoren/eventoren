import * as a from "valibot"
import { api } from "#convex/_generated/api.js"
import type { ApiKeyExpiryPreset } from "#src/auth/model/apiKeyExpiryPreset.ts"
import { apiKeyExpiryPresetSchema } from "#src/auth/model/apiKeyExpiryPreset.ts"
import type { ApiKeyListItem } from "#src/auth/model/apiKeyListItemSchema.ts"
import { apiKeyListItemSchema } from "#src/auth/model/apiKeyListItemSchema.ts"
import { apiKeyNameSchema } from "#src/auth/model/apiKeyNameSchema.ts"
import { mutationCreate } from "#src/utils/convex_client/mutationCreate.ts"
import { queryPaginatedCreate } from "#src/utils/convex_client/queryPaginatedCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const listPageSize = 25

export function eventorenApiKeysPageStateCreate() {
  const name = createSignalObject("")
  const expiryPreset = createSignalObject<ApiKeyExpiryPreset>("1-month")
  const credential = createSignalObject("")
  const busy = createSignalObject(false)
  const error = createSignalObject("")
  const editingId = createSignalObject<string | null>(null)
  const editName = createSignalObject("")
  const editError = createSignalObject("")

  const pages = queryPaginatedCreate(api.auth.apiKeyListQuery as never, {}, { pageSize: listPageSize })
  const apiKeyCreate = mutationCreate(api.auth.apiKeyCreateMutation)
  const apiKeyRename = mutationCreate(api.auth.apiKeyRenameMutation)
  const apiKeyRevoke = mutationCreate(api.auth.apiKeyRevokeMutation)
  const apiKeyRotate = mutationCreate(api.auth.apiKeyRotateMutation)

  const items = (): ApiKeyListItem[] => {
    const aggregate = pages.result()
    if (!aggregate || aggregate.success === false) return []
    const parsed = a.safeParse(a.array(apiKeyListItemSchema), aggregate.data)
    if (!parsed.success) return []
    return [...parsed.output]
  }
  const loading = () => pages.isLoading()
  const listError = () => {
    const aggregate = pages.result()
    if (!aggregate) return ""
    if (aggregate.success === false) return aggregate.errorMessage ?? "Die API-Schlüssel konnten nicht geladen werden."
    const parsed = a.safeParse(a.array(apiKeyListItemSchema), aggregate.data)
    if (!parsed.success) return "Die API-Schlüssel konnten nicht geladen werden."
    return ""
  }

  async function createKey(event: SubmitEvent) {
    event.preventDefault()
    if (busy.get() || credential.get()) return
    const parsedName = a.safeParse(apiKeyNameSchema, name.get())
    if (!parsedName.success) {
      error.set("Der Name muss 1–80 Zeichen lang sein.")
      return
    }
    const parsedPreset = a.safeParse(apiKeyExpiryPresetSchema, expiryPreset.get())
    if (!parsedPreset.success) {
      error.set("Bitte eine gültige Gültigkeit wählen.")
      return
    }
    busy.set(true)
    error.set("")
    try {
      const created = await apiKeyCreate({ name: parsedName.output, expiryPreset: parsedPreset.output })
      if (!created.success) {
        error.set("Der API-Schlüssel konnte nicht erstellt werden.")
        return
      }
      credential.set(created.data.credential)
      name.set("")
    } finally {
      busy.set(false)
    }
  }

  function dismissCredential() {
    credential.set("")
  }

  function edit(key: ApiKeyListItem) {
    if (busy.get() || credential.get()) return
    editingId.set(key.id)
    editName.set(key.name)
    editError.set("")
  }

  function cancelEdit() {
    if (busy.get()) return
    editingId.set(null)
    editName.set("")
    editError.set("")
  }

  async function saveEdit(event: SubmitEvent) {
    event.preventDefault()
    const id = editingId.get()
    if (!id || busy.get() || credential.get()) return
    const parsedName = a.safeParse(apiKeyNameSchema, editName.get())
    if (!parsedName.success) {
      editError.set("Der Name muss 1–80 Zeichen lang sein.")
      return
    }
    busy.set(true)
    editError.set("")
    try {
      const renamed = await apiKeyRename({ id: id as never, name: parsedName.output })
      if (!renamed.success) {
        editError.set("Der API-Schlüssel konnte nicht umbenannt werden.")
        return
      }
      cancelEdit()
    } finally {
      busy.set(false)
    }
  }

  async function revoke(id: ApiKeyListItem["id"]) {
    if (busy.get() || credential.get()) return
    busy.set(true)
    error.set("")
    try {
      const revoked = await apiKeyRevoke({ id })
      if (!revoked.success) {
        error.set("Der API-Schlüssel konnte nicht widerrufen werden.")
        return
      }
    } finally {
      busy.set(false)
    }
  }

  async function rotate(id: ApiKeyListItem["id"]) {
    if (busy.get() || credential.get()) return
    busy.set(true)
    error.set("")
    try {
      const rotated = await apiKeyRotate({ id })
      if (!rotated.success) {
        error.set("Der API-Schlüssel konnte nicht rotiert werden.")
        return
      }
      credential.set(rotated.data.credential)
    } finally {
      busy.set(false)
    }
  }

  return {
    loading,
    listError,
    items,
    pageNumber: () => 1,
    hasPrevious: () => false,
    hasNext: () => !pages.isDone(),
    previous: () => {},
    next: () => pages.loadMore(),
    name,
    expiryPreset,
    credential,
    busy,
    error,
    editingId,
    editName,
    editError,
    createKey,
    dismissCredential,
    edit,
    cancelEdit,
    saveEdit,
    revoke,
    rotate,
  }
}

export type EventorenApiKeysState = ReturnType<typeof eventorenApiKeysPageStateCreate>
