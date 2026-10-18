import { dashIbanValidate } from "../../../model/dashIbanValidate.ts"

import type { DashOnboardingDraft } from "./dashOnboardingDraftCreate.ts"

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function accountErrors(draft: DashOnboardingDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (draft.accountName.trim().length < 2) errors.accountName = "Gib deinen Namen mit mindestens 2 Zeichen ein."
  else if (draft.accountName.trim().length > 80) errors.accountName = "Dein Name darf höchstens 80 Zeichen haben."
  if (draft.accountEmail.trim().length === 0) errors.accountEmail = "Gib deine E-Mail-Adresse ein."
  else if (!emailPattern.test(draft.accountEmail.trim())) errors.accountEmail = "Gib eine gültige E-Mail-Adresse ein."
  if (draft.accountPassword.length < 8) errors.accountPassword = "Dein Passwort braucht mindestens 8 Zeichen."
  return errors
}

function orgErrors(draft: DashOnboardingDraft, takenSlugs: readonly string[]): Record<string, string> {
  const errors: Record<string, string> = {}
  if (draft.orgName.trim().length < 2) errors.orgName = "Gib einen Organisationsnamen mit mindestens 2 Zeichen ein."
  else if (draft.orgName.trim().length > 80) errors.orgName = "Der Organisationsname darf höchstens 80 Zeichen haben."
  if (draft.slug.trim().length === 0) errors.slug = "Gib einen Profil-Link mit mindestens 2 Zeichen ein."
  else if (!slugPattern.test(draft.slug.trim()))
    errors.slug = "Dein Profil-Link darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten."
  else if (takenSlugs.includes(draft.slug.trim()))
    errors.slug = "Dieser Profil-Link ist schon vergeben. Wähl einen anderen."
  return errors
}

function detailsErrors(draft: DashOnboardingDraft): Record<string, string> {
  const errors: Record<string, string> = {}
  if (draft.legalName.trim().length === 0) errors.legalName = "Gib den Namen für dein Impressum ein."
  if (draft.street.trim().length === 0) errors.street = "Gib deine Straße und Hausnummer für dein Impressum ein."
  if (draft.zip.trim().length === 0) errors.zip = "Gib deine Postleitzahl für dein Impressum ein."
  if (draft.city.trim().length === 0) errors.city = "Gib deinen Ort für dein Impressum ein."
  if (draft.representative.trim().length === 0)
    errors.representative = "Gib an, wer dich vertritt (z. B. 1. Vorsitzende)."
  if (draft.kind !== "privat" && draft.register.trim().length === 0)
    errors.register = "Gib dein Register an (z. B. Vereinsregister VR 4711)."
  if (draft.holder.trim().length === 0) errors.holder = "Gib den Kontoinhaber ein."
  if (draft.iban.trim().length === 0) errors.iban = "Gib deine IBAN ein."
  else if (!dashIbanValidate(draft.iban).success) errors.iban = "Deine IBAN ist ungültig. Prüfe sie bitte."
  return errors
}

/** Prüft einen Onboarding-Schritt rein (ohne Store) und gibt Feldfehler auf Deutsch zurück. */
export function dashOnboardingValidate(
  step: number,
  draft: DashOnboardingDraft,
  takenSlugs: readonly string[] = [],
): Record<string, string> {
  if (step === 0) return accountErrors(draft)
  if (step === 1) return orgErrors(draft, takenSlugs)
  if (step === 2) return detailsErrors(draft)
  return {}
}
