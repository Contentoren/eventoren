import { createEffect, createMemo, on, untrack } from "solid-js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import { dashDateFormat } from "../../../model/dashDateFormat.ts"
import type { DashEvent } from "../../../model/dashEventSchema.ts"
import type { DashMessageAudienceType } from "../../../model/dashMessageAudienceTypeSchema.ts"
import type { DashMessageKind } from "../../../model/dashMessageKindSchema.ts"
import type { DashMessage } from "../../../model/dashMessageSchema.ts"
import { dashMessageSave } from "../../../store/actions/messages/dashMessageSave.ts"
import { dashMessageSchedule } from "../../../store/actions/messages/dashMessageSchedule.ts"
import { dashMessageSend } from "../../../store/actions/messages/dashMessageSend.ts"
import { dashSessionUser } from "../../../store/dashSessionUser.ts"
import { dashStateGet } from "../../../store/dashStateGet.ts"
import type { DashMessagesState } from "../DashMessagesStateCreate.ts"
import { dashMessageRecipientsCount } from "../model/dashMessageRecipientsCount.ts"
import { dashMessageRender } from "../model/dashMessageRender.ts"
import { dashMessageSheetFill } from "../model/dashMessageSheetFill.ts"
import type { dashMessageSheetPlaceholders } from "../model/dashMessageSheetPlaceholders.ts"
import { dashMessageSheetTemplates } from "../model/dashMessageSheetTemplates.ts"

type DashMessageSheetPlaceholder = ReturnType<typeof dashMessageSheetPlaceholders>[number]

export function dashMessageSheetStateCreate(inputs: {
  open: () => boolean
  event: () => DashEvent
  existing: () => DashMessage | null
  state: () => DashMessagesState
  onClose: () => void
  onSaved: (id: string) => void
}) {
  const isSent = () => inputs.existing()?.status === "gesendet"
  const isReadonly = () => isSent()

  const loadedKey = { value: null as string | null }

  // Nur beim Öffnen bzw. Wechsel der Nachricht neu befüllen: `existing()` liefert
  // nach jedem Store-Update eine neue Objektidentität (reconcile), was einen
  // ungefilterten Effekt erneut feuern und getippte Felder zurücksetzen würde.
  createEffect(
    on(
      [inputs.open, () => inputs.existing()?.id ?? "neu"],
      ([isOpen, id]) => {
        if (!isOpen) {
          loadedKey.value = null
          return
        }
        if (loadedKey.value === id) return
        loadedKey.value = id
        const state = inputs.state()
        const message = untrack(() => inputs.existing())
        dashMessageSheetFill(state, message, id)
      },
      { defer: false },
    ),
  )

  const audience = () => ({
    type: inputs.state().audienceType.get(),
    ticketTypeIds: inputs.state().ticketTypeIds.get(),
  })
  const liveCount = createMemo(() => dashMessageRecipientsCount(dashStateGet(), inputs.event().id, audience()))
  const audienceCount = (type: DashMessageAudienceType) =>
    dashMessageRecipientsCount(dashStateGet(), inputs.event().id, {
      type,
      ticketTypeIds: inputs.state().ticketTypeIds.get(),
    })
  const firstName = () => {
    const ticket = dashStateGet().tickets.find(
      (candidate) => candidate.eventId === inputs.event().id && candidate.status === "gueltig",
    )
    return ticket?.holderName.split(" ")[0] ?? "Gast"
  }
  const previewContext = () => ({
    vorname: firstName(),
    event: inputs.event().title,
    datum: dashDateFormat(inputs.event().startsAt, "datum"),
  })
  const previewBody = () => {
    const raw = inputs.state().body.get().trim()
    return dashMessageRender(raw || "dein Text steht hier.", previewContext())
  }
  const subjectError = () =>
    inputs.state().showErrors.get() && !inputs.state().subject.get().trim() ? "Bitte gib einen Betreff ein." : null
  const bodyError = () =>
    inputs.state().showErrors.get() && !inputs.state().body.get().trim() ? "Bitte gib einen Nachrichtentext ein." : null

  const collectInput = () => ({
    ...(inputs.existing() ? { id: inputs.existing()?.id as string } : {}),
    eventId: inputs.event().id,
    kind: inputs.state().kind.get(),
    audience: audience(),
    subject: inputs.state().subject.get(),
    body: inputs.state().body.get(),
  })

  const applyTemplate = (kind: DashMessageKind) => {
    if (isReadonly()) return
    const template: { subject: string; body: string } = dashMessageSheetTemplates[kind]
    inputs.state().kind.set(kind)
    inputs.state().subject.set(template.subject.replaceAll("{event}", inputs.event().title))
    inputs
      .state()
      .body.set(
        `Hallo {vorname},\n\n${template.body
          .replaceAll("{event}", inputs.event().title)
          .replaceAll("{datum}", dashDateFormat(inputs.event().startsAt, "datum"))}`,
      )
    if (kind === "absage") {
      inputs.state().audienceType.set("alle")
      inputs.state().ticketTypeIds.set([])
    }
  }

  const insertPlaceholder = (token: DashMessageSheetPlaceholder) => {
    if (isReadonly()) return
    const current = inputs.state().body.get()
    const needsSpace = current.length > 0 && !/\s$/.test(current)
    inputs.state().body.set(`${current}${needsSpace ? " " : ""}${token}`)
  }

  const toggleTicketType = (id: string) => {
    if (isReadonly()) return
    const current = inputs.state().ticketTypeIds.get()
    inputs.state().ticketTypeIds.set(current.includes(id) ? current.filter((entry) => entry !== id) : [...current, id])
  }

  const audienceTypeSelect = (value: string) => {
    if (!isReadonly()) inputs.state().audienceType.set(value as DashMessageAudienceType)
  }

  const saveDraft = () => {
    const result = dashMessageSave(collectInput())
    if (!result.success) {
      inputs.state().showErrors.set(true)
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    // "neu" wird zur neuen Entwurfs-ID: als dieselbe Session behandeln, damit der
    // Refill-Guard die Felder nicht zurücksetzt.
    loadedKey.value = result.data.id
    inputs.state().showErrors.set(false)
    toastAdd({ title: "Entwurf gespeichert", variant: "success" })
    inputs.onSaved(result.data.id)
  }

  const sendNow = () => {
    const subject = inputs.state().subject.get().trim()
    const body = inputs.state().body.get().trim()
    if (!subject || !body) {
      inputs.state().showErrors.set(true)
      toastAdd({
        title: !subject ? "Bitte gib einen Betreff ein." : "Bitte gib einen Nachrichtentext ein.",
        variant: "error",
      })
      return
    }
    inputs.state().showErrors.set(false)
    inputs.state().sendConfirmOpen.set(true)
  }

  const sendConfirm = () => {
    const existing = inputs.existing()
    let id = existing?.id
    if (!id || existing?.status !== "entwurf") {
      const saved = dashMessageSave(collectInput())
      if (!saved.success) {
        inputs.state().showErrors.set(true)
        inputs.state().sendConfirmOpen.set(false)
        toastAdd({ title: saved.errorMessage, variant: "error" })
        return
      }
      id = saved.data.id
    }
    const result = dashMessageSend(id)
    inputs.state().sendConfirmOpen.set(false)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `An ${result.data.recipientCount} Empfänger gesendet`, variant: "success" })
    inputs.onClose()
  }

  const closeSendConfirm = () => inputs.state().sendConfirmOpen.set(false)

  const sendTest = () => {
    const sessionEmail = dashSessionUser()?.email
    const fallback = dashStateGet().users.find((user) => user.email.includes("@"))?.email
    const email = sessionEmail ?? fallback ?? "mara@kulturhaus-lindenhof.de"
    toastAdd({ title: `Test an ${email} gesendet`, variant: "success" })
  }

  const openPlan = () => {
    if (isReadonly()) return
    inputs.state().planOpen.set(true)
  }

  const closePlan = () => inputs.state().planOpen.set(false)

  const plan = () => {
    const at = inputs.state().planValue.get()
    if (!at) {
      toastAdd({ title: "Bitte wähle Datum und Uhrzeit.", variant: "error" })
      return
    }
    let id = inputs.existing()?.id
    if (!id) {
      const saved = dashMessageSave(collectInput())
      if (!saved.success) {
        inputs.state().showErrors.set(true)
        toastAdd({ title: saved.errorMessage, variant: "error" })
        return
      }
      id = saved.data.id
    }
    const result = dashMessageSchedule(id, at)
    if (!result.success) {
      toastAdd({ title: result.errorMessage, variant: "error" })
      return
    }
    toastAdd({ title: `Geplant für ${dashDateFormat(at, "kurz")}`, variant: "success" })
    inputs.onClose()
  }

  const requestDelete = () => {
    const existing = inputs.existing()
    if (!existing || isSent()) return
    inputs.state().deleteId.set(existing.id)
  }

  return {
    isSent,
    isReadonly,
    liveCount,
    audienceCount,
    previewBody,
    subjectError,
    bodyError,
    applyTemplate,
    insertPlaceholder,
    toggleTicketType,
    audienceTypeSelect,
    saveDraft,
    sendNow,
    sendConfirm,
    closeSendConfirm,
    sendTest,
    openPlan,
    closePlan,
    plan,
    requestDelete,
  }
}

export type DashMessageSheetState = ReturnType<typeof dashMessageSheetStateCreate>
