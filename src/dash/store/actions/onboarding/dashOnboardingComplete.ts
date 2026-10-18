import { createResult, createResultError, type Result } from "#result"

import type { DashImprint } from "../../../model/dashImprintSchema.ts"
import type { DashOrgKind } from "../../../model/dashOrgKindSchema.ts"
import { dashIbanValidate } from "../../../model/dashIbanValidate.ts"
import type { DashOrg } from "../../../model/dashOrgSchema.ts"
import type { DashTaxStatus } from "../../../model/dashTaxStatusSchema.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import { dashIdCreate } from "../../dashIdCreate.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"
import { dashOnboardingSlugUnique } from "./dashOnboardingSlugUnique.ts"

export type DashOnboardingCompleteInput = {
  account: { name: string; email: string } | null
  org: { kind: DashOrgKind; name: string; slug: string; logoDataUrl: string | null }
  imprint: DashImprint
  tax: { status: DashTaxStatus }
  bank: { holder: string; iban: string }
  termsAccepted: true
  dpaAccepted: true
}

/** Legt Organisation, Inhaber-Mitgliedschaft und Session-Wechsel an; Bereich "einstellungen". */
export function dashOnboardingComplete(
  input: DashOnboardingCompleteInput,
  store: DashStore = dashStoreGet(),
): Result<{ orgId: string }> {
  const op = "dashOnboardingComplete"
  const user = store.state.users.find((candidate) => candidate.id === store.state.session.userId)
  if (!user) return createResultError(op, "Kein Demo-Konto angemeldet.")

  if (input.account) {
    if (input.account.name.trim().length < 2)
      return createResultError(op, "Gib deinen Namen mit mindestens 2 Zeichen ein.")
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.account.email.trim()))
      return createResultError(op, "Gib eine gültige E-Mail-Adresse ein.")
  }

  const name = input.org.name.trim()
  if (name.length < 2) return createResultError(op, "Gib einen Organisationsnamen mit mindestens 2 Zeichen ein.")
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(input.org.slug.trim()))
    return createResultError(op, "Dein Profil-Link darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten.")
  const slug = dashOnboardingSlugUnique(
    input.org.slug,
    store.state.orgs.map((org) => org.slug),
  )

  if (input.imprint.legalName.trim().length === 0) return createResultError(op, "Gib den Namen für dein Impressum ein.")
  if (input.imprint.street.trim().length === 0)
    return createResultError(op, "Gib deine Straße und Hausnummer für dein Impressum ein.")
  if (input.imprint.zip.trim().length === 0)
    return createResultError(op, "Gib deine Postleitzahl für dein Impressum ein.")
  if (input.imprint.city.trim().length === 0) return createResultError(op, "Gib deinen Ort für dein Impressum ein.")
  if (input.imprint.representative.trim().length === 0)
    return createResultError(op, "Gib an, wer dich vertritt (z. B. 1. Vorsitzende).")

  if (input.bank.holder.trim().length === 0) return createResultError(op, "Gib den Kontoinhaber ein.")
  const ibanResult = dashIbanValidate(input.bank.iban)
  if (!ibanResult.success) return createResultError(op, "Deine IBAN ist ungültig. Prüfe sie bitte.")

  const nowIso = new Date().toISOString()
  const orgId = dashIdCreate("org")
  const accountEmail = input.account ? input.account.email.trim() : user.email
  const accountName = input.account ? input.account.name.trim() : user.name
  const org: DashOrg = {
    id: orgId,
    slug,
    name,
    kind: input.org.kind,
    subtitle: "",
    description: "",
    logoDataUrl: input.org.logoDataUrl,
    website: "",
    email: accountEmail,
    phone: "",
    socials: { instagram: "", facebook: "", tiktok: "", youtube: "", x: "", linkedin: "" },
    imprint: {
      legalName: input.imprint.legalName.trim(),
      street: input.imprint.street.trim(),
      zip: input.imprint.zip.trim(),
      city: input.imprint.city.trim(),
      representative: input.imprint.representative.trim(),
      register: input.imprint.register.trim(),
      vatId: input.imprint.vatId.trim(),
    },
    bank: { holder: input.bank.holder.trim(), iban: ibanResult.data },
    tax: { status: input.tax.status, defaultRateBps: 1900 },
    fee: { percentBps: 500, fixedCents: 49, payer: "kaeufer" },
    status: "pruefung",
    statusReason: "",
    termsAcceptedAt: nowIso,
    dpaAcceptedAt: nowIso,
    createdAt: nowIso,
    voucherDefaultValidity: "3-jahre-jahresende",
  }

  const stored = store.update(op, (draft) => {
    const target = draft.users.find((candidate) => candidate.id === draft.session.userId)
    if (target && input.account) {
      target.name = accountName
      target.email = accountEmail
    }
    draft.orgs.push({ ...org })
    draft.members.push({
      id: `mem-${orgId.slice(4)}`,
      orgId,
      userId: draft.session.userId,
      name: input.account ? accountName : (target?.name ?? ""),
      email: input.account ? accountEmail : (target?.email ?? ""),
      role: "inhaber",
      status: "aktiv",
      invitedAt: null,
    })
    draft.session.activeOrgId = orgId
    draft.session.simulatedRole = null
    dashAuditAdd(draft, {
      orgId,
      eventId: null,
      area: "einstellungen",
      action: `Organisation „${name}“ angelegt`,
      before: null,
      after: "In Prüfung",
    })
  })
  if (!stored.success) return createResultError(op, "Deine Organisation konnte nicht angelegt werden.")
  return createResult({ orgId })
}
