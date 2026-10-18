import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import type { DashMessagesState } from "../DashMessagesStateCreate.ts"

/** Setzt Sheet-Felder neu; auch Dialog- und Fehlerzustand zurücksetzen. */
export function dashMessageSheetFill(state: DashMessagesState, message: DashMessage | null, _key?: string): void {
  void _key
  state.sendConfirmOpen.set(false)
  state.planOpen.set(false)
  state.previewOpen.set(false)
  state.deleteId.set(null)
  state.planValue.set(message?.scheduledAt ?? null)
  state.showErrors.set(false)
  if (!message) {
    state.kind.set("info")
    state.audienceType.set("alle")
    state.ticketTypeIds.set([])
    state.subject.set("")
    state.body.set("")
    return
  }
  state.kind.set(message.kind)
  state.audienceType.set(message.audience.type)
  state.ticketTypeIds.set([...message.audience.ticketTypeIds])
  state.subject.set(message.subject)
  state.body.set(message.body)
}
