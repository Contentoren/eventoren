import { createResult } from "../ui/createResult.ts"
import { createResultError } from "../ui/createResultError.ts"
import type { Result } from "../ui/Result.ts"
import * as v from "valibot"
import { ticketCheckoutLegalDocumentRevision } from "./ticketCheckoutLegalDocumentRevision.ts"
import { ticketContactDraftKey } from "./ticketContactDraftKey.ts"
import { ticketContactDraftSave } from "./ticketContactDraftSave.ts"
import { type TicketContactDraftStored, ticketContactDraftStoredSchema } from "./ticketContactDraftStoredSchema.ts"
import { ticketContactEmpty } from "./ticketContactEmpty.ts"

const op = "ticketContactDraftLoad"

export function ticketContactDraftLoad(): Result<TicketContactDraftStored> {
  let raw: string | null = null
  let fromLocalStorage = false
  try {
    if (typeof sessionStorage !== "undefined") raw = sessionStorage.getItem(ticketContactDraftKey)
    if (raw === null && typeof localStorage !== "undefined") {
      raw = localStorage.getItem(ticketContactDraftKey)
      fromLocalStorage = raw !== null
    }
  } catch (error) {
    return createResultError(op, "Entwurf konnte nicht gelesen werden.", error)
  }
  if (raw === null)
    return createResult({
      contact: ticketContactEmpty(),
      participantNames: {},
      documentSetRevision: ticketCheckoutLegalDocumentRevision,
      rememberDraft: false,
    })

  let parsed: unknown = null
  try {
    parsed = JSON.parse(raw)
  } catch (error) {
    return createResultError(op, "Entwurf ist beschädigt.", error)
  }
  if (typeof parsed !== "object" || parsed === null) return createResultError(op, "Entwurf ist kein Objekt.", parsed)

  const candidate = parsed as Record<string, unknown>
  const validated = v.safeParse(ticketContactDraftStoredSchema, {
    ...candidate,
    contact: candidate.contact ?? candidate,
    documentSetRevision: ticketCheckoutLegalDocumentRevision,
    rememberDraft: fromLocalStorage && candidate.rememberDraft === true,
  })
  if (!validated.success) return createResultError(op, v.summarize(validated.issues), parsed)

  const draft = validated.output
  // Stored drafts are returned verbatim; the DE default for new visitors
  // lives in ticketContactEmpty so the country input can fall back to it.
  // Old local drafts do not constitute a request to remember details across sessions.
  if (
    (fromLocalStorage && !draft.rememberDraft) ||
    "termsAccepted" in candidate ||
    "privacyAcknowledged" in candidate ||
    "legalAccepted" in candidate
  )
    ticketContactDraftSave(draft, draft.rememberDraft)
  return createResult(draft)
}
