import { createResult, createResultError, type Result } from "#result"

import type { DashVoucherValidity } from "../../../model/dashVoucherValiditySchema.ts"
import { dashVoucherExpiry } from "../../../model/dashVoucherExpiry.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashNow } from "../../dashNow.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashVoucherStatusResolve } from "./dashVoucherStatusResolve.ts"

function dashVoucherValidityLabel(validity: DashVoucherValidity, expiresAt: string | null): string {
  if (expiresAt === null) return "Unbegrenzt gültig"
  const date = new Intl.DateTimeFormat("de-DE", {
    timeZone: "Europe/Berlin",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(expiresAt))
  const prefix =
    validity === "1-jahr"
      ? "1 Jahr"
      : validity === "2-jahre"
        ? "2 Jahre"
        : validity === "3-jahre-jahresende"
          ? "3 Jahre zum Jahresende"
          : "Datum"
  return `${prefix} · gültig bis ${date}`
}

/** Ändert die Laufzeit eines Gutscheins (du sprichst): rechnet ab Ausstellung neu, reaktiviert abgelaufene bei Zukunftsdatum. */
export function dashVoucherValidityChange(
  id: string,
  validity: DashVoucherValidity,
  customDate: string | null,
  store: DashStore = dashStoreGet(),
): Result<string> {
  const op = "dashVoucherValidityChange"
  const voucher = store.state.vouchers.find((candidate) => candidate.id === id)
  if (!voucher) return createResultError(op, "Gutschein nicht gefunden.")
  if (validity === "datum") {
    if (!customDate || !/^\d{4}-\d{2}-\d{2}$/u.test(customDate))
      return createResultError(op, "Bitte wähle ein Datum für „Gültig bis“.")
  }
  const expiresAt = dashVoucherExpiry(voucher.createdAt, validity, customDate)
  if (validity === "datum" && expiresAt === null) return createResultError(op, "Das gewählte Datum ist ungültig.")
  const now = dashNow()()
  const stored = store.update(op, (draft) => {
    const target = draft.vouchers.find((candidate) => candidate.id === id)
    if (!target) return
    const before = dashVoucherValidityLabel(target.validity, target.expiresAt)
    target.validity = validity
    target.expiresAt = expiresAt
    if (target.status !== "deaktiviert") {
      target.status = dashVoucherStatusResolve({ ...target, validity, expiresAt }, now)
    }
    dashAuditAdd(draft, {
      orgId: target.orgId,
      eventId: null,
      area: "codes",
      action: `Gutschein ${target.code} Laufzeit geändert`,
      before,
      after: dashVoucherValidityLabel(validity, expiresAt),
    })
  })
  if (!stored.success) return createResultError(op, "Die Laufzeit konnte nicht geändert werden.")
  return createResult(dashVoucherValidityLabel(validity, expiresAt))
}
