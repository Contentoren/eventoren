const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

type ProfilePatch = {
  name?: unknown
  slug?: unknown
  subtitle?: unknown
  description?: unknown
  logoDataUrl?: unknown
  website?: unknown
  email?: unknown
  phone?: unknown
  socials?: Partial<Record<string, unknown>>
  imprint?: Partial<Record<string, unknown>>
}

function textOf(value: unknown): string | null {
  if (typeof value !== "string") return null
  return value
}

/** Prüft das Organisator-Profil rein (ohne Store) und gibt Feldfehler auf Deutsch zurück. */
export function dashProfileValidate(patch: ProfilePatch, otherSlugs: readonly string[] = []): Record<string, string> {
  const errors: Record<string, string> = {}

  if (patch.name !== undefined) {
    const raw = textOf(patch.name)
    const value = raw === null ? "" : raw.trim()
    if (value.length < 2) errors["name"] = "Gib einen Namen mit mindestens 2 Zeichen ein."
    else if (value.length > 80) errors["name"] = "Dein Name darf höchstens 80 Zeichen haben."
  }

  if (patch.slug !== undefined) {
    const raw = textOf(patch.slug)
    const value = raw === null ? "" : raw.trim()
    if (value.length === 0) errors["slug"] = "Gib einen Profil-Link mit mindestens 2 Zeichen ein."
    else if (value.length > 60) errors["slug"] = "Dein Profil-Link darf höchstens 60 Zeichen haben."
    else if (!slugPattern.test(value))
      errors["slug"] = "Dein Profil-Link darf nur Kleinbuchstaben, Zahlen und Bindestriche enthalten."
    else if (otherSlugs.includes(value)) errors["slug"] = "Dieser Profil-Link ist schon vergeben. Wähl einen anderen."
  }

  if (patch.subtitle !== undefined) {
    const raw = textOf(patch.subtitle)
    const value = raw === null ? "" : raw
    if (value.length > 80) errors["subtitle"] = "Dein Untertitel darf höchstens 80 Zeichen haben."
  }

  if (patch.description !== undefined) {
    const raw = textOf(patch.description)
    const value = raw === null ? "" : raw
    if (value.length > 1000) errors["description"] = "Deine Beschreibung darf höchstens 1000 Zeichen haben."
  }

  if (patch.website !== undefined) {
    const raw = textOf(patch.website)
    const value = raw === null ? "" : raw.trim()
    if (value.length > 0 && !/^https?:\/\/\S+\.\S+/.test(value))
      errors["website"] = "Gib eine gültige Website mit https:// ein, z. B. https://dein-verein.de."
    else if (value.length > 200) errors["website"] = "Deine Website darf höchstens 200 Zeichen haben."
  }

  if (patch.email !== undefined) {
    const raw = textOf(patch.email)
    const value = raw === null ? "" : raw.trim()
    if (value.length > 0 && !emailPattern.test(value)) errors["email"] = "Gib eine gültige E-Mail-Adresse ein."
    else if (value.length > 120) errors["email"] = "Deine E-Mail-Adresse darf höchstens 120 Zeichen haben."
  }

  if (patch.phone !== undefined) {
    const raw = textOf(patch.phone)
    const value = raw === null ? "" : raw
    if (value.length > 40) errors["phone"] = "Deine Telefonnummer darf höchstens 40 Zeichen haben."
  }

  if (patch.logoDataUrl !== undefined && patch.logoDataUrl !== null) {
    const raw = textOf(patch.logoDataUrl)
    if (raw === null) errors["logoDataUrl"] = "Dein Logo konnte nicht gelesen werden. Lade es bitte erneut hoch."
    else if (raw.length > 0 && !raw.startsWith("data:image/"))
      errors["logoDataUrl"] = "Dein Logo muss ein Bild sein. Lade es bitte erneut hoch."
  }

  if (patch.socials !== undefined && patch.socials !== null) {
    const keys = ["instagram", "facebook", "tiktok", "youtube", "x", "linkedin"]
    for (const key of keys) {
      const entry = (patch.socials as Record<string, unknown>)[key]
      if (entry === undefined) continue
      const raw = textOf(entry)
      if (raw === null) {
        errors[`socials.${key}`] = `Dein ${key}-Eintrag ist ungültig.`
        continue
      }
      if (raw.length > 200) errors[`socials.${key}`] = "Dieser Eintrag darf höchstens 200 Zeichen haben."
    }
  }

  if (patch.imprint !== undefined && patch.imprint !== null) {
    const imprint = patch.imprint as Record<string, unknown>
    const required: Array<[string, string]> = [
      ["legalName", "Gib den Namen für dein Impressum ein."],
      ["street", "Gib deine Straße und Hausnummer für dein Impressum ein."],
      ["zip", "Gib deine Postleitzahl für dein Impressum ein."],
      ["city", "Gib deinen Ort für dein Impressum ein."],
      ["representative", "Gib an, wer dich vertritt (z. B. 1. Vorsitzende)."],
    ]
    for (const [key, message] of required) {
      const entry = imprint[key]
      if (entry === undefined) continue
      const raw = textOf(entry)
      if (raw === null || raw.trim().length === 0) errors[`imprint.${key}`] = message
      else if (raw.length > 120) errors[`imprint.${key}`] = "Dieser Eintrag darf höchstens 120 Zeichen haben."
    }
    for (const key of ["register", "vatId"]) {
      const entry = imprint[key]
      if (entry === undefined) continue
      const raw = textOf(entry)
      if (raw === null) {
        errors[`imprint.${key}`] = "Dieser Eintrag ist ungültig."
        continue
      }
      if (raw.length > 120) errors[`imprint.${key}`] = "Dieser Eintrag darf höchstens 120 Zeichen haben."
    }
  }

  return errors
}
