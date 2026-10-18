import { createResult, createResultError, type Result } from "#result"

import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

/** Protokolliert den Versand eines Gutscheins per E-Mail (du sprichst): nur Audit + Hinweis, kein echter Versand. */
export function dashVoucherSend(id: string, store: DashStore = dashStoreGet()): Result<string> {
  const op = "dashVoucherSend"
  const voucher = store.state.vouchers.find((candidate) => candidate.id === id)
  if (!voucher) return createResultError(op, "Gutschein nicht gefunden.")
  const email = voucher.recipientEmail.trim()
  if (!email) return createResultError(op, "Bitte gib zuerst eine E-Mail-Adresse für den Empfänger an.")
  const stored = store.update(op, (draft) => {
    const target = draft.vouchers.find((candidate) => candidate.id === id)
    if (!target) return
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: null,
      area: "codes",
      action: `Gutschein ${target.code} per E-Mail gesendet`,
      before: null,
      after: email,
    })
  })
  if (!stored.success) return createResultError(op, "Der Versand konnte nicht protokolliert werden.")
  return createResult(email)
}
