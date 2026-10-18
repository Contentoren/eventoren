import { createResult, createResultError, type Result } from "#result"

import type { DashVoucher } from "../../../model/dashVoucherSchema.ts"
import type { DashVoucherValidity } from "../../../model/dashVoucherValiditySchema.ts"
import { dashCodeGenerate } from "../../../model/dashCodeGenerate.ts"
import { dashRandomCreate } from "../../../model/dashRandomCreate.ts"
import { dashVoucherExpiry } from "../../../model/dashVoucherExpiry.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import { dashNow } from "../../dashNow.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

export type DashVoucherCreateInput = {
  orgId: string
  initialCents: number
  kind: "verkauft" | "kostenlos"
  recipientName: string
  recipientEmail: string
  message: string
  validity: DashVoucherValidity
  customDate: string | null
}

function dashVoucherCustomDateCheck(validity: DashVoucherValidity, customDate: string | null): string | null {
  if (validity !== "datum") return null
  if (!customDate || !/^\d{4}-\d{2}-\d{2}$/u.test(customDate)) return "Bitte wähle ein Datum für „Gültig bis“."
  return null
}

/** Legt einen Gutschein an (du sprichst): Code „GS-“ + 8 Zeichen, Guthaben = Startwert, Status aktiv. */
export function dashVoucherCreate(
  input: DashVoucherCreateInput,
  store: DashStore = dashStoreGet(),
): Result<DashVoucher> {
  const op = "dashVoucherCreate"
  if (!Number.isInteger(input.initialCents) || input.initialCents < 100)
    return createResultError(op, "Der Wert muss mindestens 1,00 € betragen.")
  const org = store.state.orgs.find((candidate) => candidate.id === input.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  const dateError = dashVoucherCustomDateCheck(input.validity, input.customDate)
  if (dateError) return createResultError(op, dateError)
  const existing = store.state.vouchers
    .filter((voucher) => voucher.orgId === input.orgId)
    .map((voucher) => voucher.code)
  const [code] = dashCodeGenerate({
    prefix: "GS-",
    count: 1,
    length: 8,
    existing,
    random: dashRandomCreate(Date.now()),
  })
  if (!code) return createResultError(op, "Es konnte kein eindeutiger Code erzeugt werden.")
  const createdAt = dashNow()().toISOString()
  const expiresAt = dashVoucherExpiry(createdAt, input.validity, input.customDate)
  if (input.validity === "datum" && expiresAt === null) return createResultError(op, "Das gewählte Datum ist ungültig.")
  const voucher: DashVoucher = {
    id: dashIdCreate("vou"),
    orgId: input.orgId,
    code,
    initialCents: input.initialCents,
    balanceCents: input.initialCents,
    kind: input.kind,
    recipientName: input.recipientName.trim(),
    recipientEmail: input.recipientEmail.trim(),
    message: input.message.trim().slice(0, 300),
    validity: input.validity,
    expiresAt,
    status: "aktiv",
    createdAt,
    redemptions: [],
  }
  const stored = store.update(op, (draft) => {
    draft.vouchers.push(voucher)
    dashAuditAdd(draft, {
      orgId: input.orgId,
      eventId: null,
      area: "codes",
      action: `Gutschein ${code} erstellt`,
      before: null,
      after: `${voucher.kind === "verkauft" ? "Verkauft" : "Kostenlos"} · ${(input.initialCents / 100).toLocaleString("de-DE")} €`,
    })
  })
  if (!stored.success) return createResultError(op, "Der Gutschein konnte nicht gespeichert werden.")
  return createResult(voucher)
}
