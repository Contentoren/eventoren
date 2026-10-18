import { createResult, createResultError, type Result } from "#result"
import * as v from "valibot"

import type { DashImprint } from "../../../model/dashImprintSchema.ts"
import { dashOrgSchema, type DashOrg } from "../../../model/dashOrgSchema.ts"
import type { DashSocials } from "../../../model/dashSocialsSchema.ts"
import { dashSocialNetworksCreate, type DashSocialNetwork } from "../../../ui/social/dashSocialNetworks.ts"
import { dashProfileValidate } from "../../../pages/profile/model/dashProfileValidate.ts"
import { dashAuditAdd } from "../../dashAuditAdd.ts"
import type { DashStore } from "../../dashStoreCreate.ts"
import { dashStoreGet } from "../../dashStoreGet.ts"

type DashOrgProfilePatch = Partial<{
  name: string
  slug: string
  subtitle: string
  description: string
  logoDataUrl: string | null
  website: string
  email: string
  phone: string
  socials: DashSocials
  imprint: DashImprint
}>

const socialLabels = new Map<DashSocialNetwork, string>(
  dashSocialNetworksCreate().map((network) => [network.id, network.label]),
)

const imprintLabels: Readonly<Record<keyof DashImprint, string>> = {
  legalName: "Name",
  street: "Straße",
  zip: "PLZ",
  city: "Ort",
  representative: "Vertretung",
  register: "Register",
  vatId: "USt-ID",
}

/** Ermittelt lesbare Feldnamen aller geänderten Profilwerte für das Audit. */
function dashOrgProfileChanges(org: DashOrg, patch: DashOrgProfilePatch): string[] {
  const changed: string[] = []
  if (patch.name !== undefined && patch.name !== org.name) changed.push("Name")
  if (patch.slug !== undefined && patch.slug !== org.slug) changed.push("Profil-Link")
  if (patch.subtitle !== undefined && patch.subtitle !== org.subtitle) changed.push("Untertitel")
  if (patch.description !== undefined && patch.description !== org.description) changed.push("Beschreibung")
  if (patch.logoDataUrl !== undefined && patch.logoDataUrl !== org.logoDataUrl) changed.push("Logo")
  if (patch.website !== undefined && patch.website !== org.website) changed.push("Website")
  if (patch.email !== undefined && patch.email !== org.email) changed.push("E-Mail")
  if (patch.phone !== undefined && patch.phone !== org.phone) changed.push("Telefon")
  if (patch.socials !== undefined) {
    for (const [network, label] of socialLabels) {
      if (patch.socials[network] !== undefined && patch.socials[network] !== org.socials[network])
        changed.push(`Social Media (${label})`)
    }
  }
  if (patch.imprint !== undefined) {
    for (const [key, label] of Object.entries(imprintLabels) as Array<[keyof DashImprint, string]>) {
      if (patch.imprint[key] !== undefined && patch.imprint[key] !== org.imprint[key])
        changed.push(`Anbieterangaben (${label})`)
    }
  }
  return changed
}

/** Aktualisiert das Organisationsprofil, prüft alle Felder und schreibt ein Audit in den Bereich "profil". */
export function dashOrgProfileUpdate(
  input: { orgId: string; patch: DashOrgProfilePatch },
  store: DashStore = dashStoreGet(),
): Result<void> {
  const op = "dashOrgProfileUpdate"
  const org = store.state.orgs.find((candidate) => candidate.id === input.orgId)
  if (!org) return createResultError(op, "Organisation nicht gefunden.")
  const otherSlugs = store.state.orgs.filter((candidate) => candidate.id !== org.id).map((candidate) => candidate.slug)
  const firstError = Object.values(dashProfileValidate(input.patch, otherSlugs))[0]
  if (firstError) return createResultError(op, firstError)
  const { socials, imprint, ...scalars } = input.patch
  const next: DashOrg = {
    ...org,
    ...scalars,
    socials: { ...org.socials, ...socials },
    imprint: { ...org.imprint, ...imprint },
  }
  if (!v.safeParse(dashOrgSchema, next).success) return createResultError(op, "Deine Profil-Daten sind ungültig.")
  const changed = dashOrgProfileChanges(org, input.patch)
  return store.update(op, (draft) => {
    const target = draft.orgs.find((candidate) => candidate.id === input.orgId)
    if (!target) throw new Error("Organisation nicht gefunden.")
    Object.assign(target, next)
    dashAuditAdd(draft, {
      orgId: target.id,
      eventId: null,
      area: "profil",
      action: `Profil aktualisiert${changed.length > 0 ? ` (${changed.join(", ")})` : ""}`,
    })
  })
}
