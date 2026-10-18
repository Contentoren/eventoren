import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type DashGuestsQuotaForm = {
  name: ReturnType<typeof createSignalObject<string>>
  limit: ReturnType<typeof createSignalObject<string>>
  showErrors: ReturnType<typeof createSignalObject<boolean>>
  confirmDelete: ReturnType<typeof createSignalObject<boolean>>
}

export type DashGuestsSingleForm = {
  name: ReturnType<typeof createSignalObject<string>>
  email: ReturnType<typeof createSignalObject<string>>
  quotaId: ReturnType<typeof createSignalObject<string>>
  plusOnes: ReturnType<typeof createSignalObject<number>>
  note: ReturnType<typeof createSignalObject<string>>
  sendTicket: ReturnType<typeof createSignalObject<boolean>>
  showErrors: ReturnType<typeof createSignalObject<boolean>>
}

export type DashGuestsState = {
  quota: DashGuestsQuotaForm
  editingQuotaId: ReturnType<typeof createSignalObject<string | null>>
  quotaOpen: ReturnType<typeof createSignalObject<boolean>>
  single: DashGuestsSingleForm
  bulkText: ReturnType<typeof createSignalObject<string>>
  bulkQuotaId: ReturnType<typeof createSignalObject<string>>
  bulkSend: ReturnType<typeof createSignalObject<boolean>>
  tab: ReturnType<typeof createSignalObject<"einzeln" | "mehrere">>
  query: ReturnType<typeof createSignalObject<string>>
  statusFilter: ReturnType<typeof createSignalObject<"alle" | "eingecheckt" | "offen">>
  quotaFilter: ReturnType<typeof createSignalObject<string | null>>
  confirmDelete: ReturnType<typeof createSignalObject<string | null>>
}

/** Reine Signal-States der Gästeliste (Kontingent-Sheet, Einzel-/Bulk-Form, Filter). */
export function DashGuestsStateCreate(): DashGuestsState {
  return {
    quota: {
      name: createSignalObject(""),
      limit: createSignalObject(""),
      showErrors: createSignalObject(false),
      confirmDelete: createSignalObject(false),
    },
    editingQuotaId: createSignalObject<string | null>(null),
    quotaOpen: createSignalObject(false),
    single: {
      name: createSignalObject(""),
      email: createSignalObject(""),
      quotaId: createSignalObject(""),
      plusOnes: createSignalObject(0),
      note: createSignalObject(""),
      sendTicket: createSignalObject(true),
      showErrors: createSignalObject(false),
    },
    bulkText: createSignalObject(""),
    bulkQuotaId: createSignalObject(""),
    bulkSend: createSignalObject(true),
    tab: createSignalObject<"einzeln" | "mehrere">("einzeln"),
    query: createSignalObject(""),
    statusFilter: createSignalObject<"alle" | "eingecheckt" | "offen">("alle"),
    quotaFilter: createSignalObject<string | null>(null),
    confirmDelete: createSignalObject<string | null>(null),
  }
}
