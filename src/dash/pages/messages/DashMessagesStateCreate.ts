import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { DashMessageAudienceType } from "../../model/dashMessageAudienceTypeSchema.ts"
import type { DashMessageKind } from "../../model/dashMessageKindSchema.ts"

export type DashMessagesState = {
  sendConfirmOpen: ReturnType<typeof createSignalObject<boolean>>
  planOpen: ReturnType<typeof createSignalObject<boolean>>
  deleteId: ReturnType<typeof createSignalObject<string | null>>
  planValue: ReturnType<typeof createSignalObject<string | null>>
  previewOpen: ReturnType<typeof createSignalObject<boolean>>
  kind: ReturnType<typeof createSignalObject<DashMessageKind>>
  audienceType: ReturnType<typeof createSignalObject<DashMessageAudienceType>>
  ticketTypeIds: ReturnType<typeof createSignalObject<string[]>>
  subject: ReturnType<typeof createSignalObject<string>>
  body: ReturnType<typeof createSignalObject<string>>
  showErrors: ReturnType<typeof createSignalObject<boolean>>
}

/** Seiten-State für Nachrichten: Sheet-Felder plus Dialoge. */
export function DashMessagesStateCreate(): DashMessagesState {
  return {
    sendConfirmOpen: createSignalObject(false),
    planOpen: createSignalObject(false),
    deleteId: createSignalObject<string | null>(null),
    planValue: createSignalObject<string | null>(null),
    previewOpen: createSignalObject(false),
    kind: createSignalObject<DashMessageKind>("info"),
    audienceType: createSignalObject<DashMessageAudienceType>("alle"),
    ticketTypeIds: createSignalObject<string[]>([]),
    subject: createSignalObject(""),
    body: createSignalObject(""),
    showErrors: createSignalObject(false),
  }
}
