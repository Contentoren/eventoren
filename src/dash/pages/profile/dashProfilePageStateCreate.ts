import { createEffect, createMemo, on } from "solid-js"

import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { DashOrg } from "../../model/dashOrgSchema.ts"
import type { DashSocialNetwork } from "../../ui/social/dashSocialNetworks.ts"
import { dashProfileValidate } from "./model/dashProfileValidate.ts"
import { dashOrgProfileUpdate } from "../../store/actions/profile/dashOrgProfileUpdate.ts"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashCan } from "../../store/dashCan.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"

export type DashProfileImprintForm = {
  legalName: string
  street: string
  zip: string
  city: string
  representative: string
  register: string
  vatId: string
}

export type DashProfileForm = {
  name: string
  slug: string
  subtitle: string
  description: string
  logoDataUrl: string | null
  website: string
  email: string
  phone: string
  socials: Record<DashSocialNetwork, string>
  imprint: DashProfileImprintForm
}

function dashProfileFormCreate(org: DashOrg): DashProfileForm {
  return {
    name: org.name,
    slug: org.slug,
    subtitle: org.subtitle,
    description: org.description,
    logoDataUrl: org.logoDataUrl,
    website: org.website,
    email: org.email,
    phone: org.phone,
    socials: { ...org.socials },
    imprint: { ...org.imprint },
  }
}

function dashProfilePatchCreate(form: DashProfileForm) {
  return {
    name: form.name,
    slug: form.slug.trim(),
    subtitle: form.subtitle,
    description: form.description,
    logoDataUrl: form.logoDataUrl,
    website: form.website.trim(),
    email: form.email.trim(),
    phone: form.phone,
    socials: { ...form.socials },
    imprint: { ...form.imprint },
  }
}

/** Seitenzustand des Profil-Editors: Formular, Dirty-Erkennung, Validierung und Speichern. */
export function dashProfilePageStateCreate() {
  const org = () => dashActiveOrg()
  const canEdit = () => dashCan("profil.bearbeiten")
  const initial = () => {
    const current = org()
    return current ? dashProfileFormCreate(current) : null
  }
  const form = createSignalObject<DashProfileForm | null>(initial())
  const saving = createSignalObject(false)
  const saveError = createSignalObject<string | null>(null)
  const slugEditing = createSignalObject(false)

  const snapshot = createMemo(() => {
    const fresh = initial()
    return fresh ? JSON.stringify(fresh) : null
  })

  const dirty = () => {
    const current = form.get()
    const base = snapshot()
    if (!current || base === null) return false
    return JSON.stringify(current) !== base
  }

  createEffect(
    on(
      () =>
        dashStateGet()
          .orgs.map((entry) => JSON.stringify(entry))
          .join("|"),
      () => {
        if (dirty()) return
        const fresh = initial()
        if (fresh) form.set(fresh)
        slugEditing.set(false)
        saveError.set(null)
      },
    ),
  )

  const liveErrors = (): Record<string, string> => {
    const current = org()
    const value = form.get()
    if (!current || !value) return {}
    const otherSlugs = dashStateGet()
      .orgs.filter((entry) => entry.id !== current.id)
      .map((entry) => entry.slug)
    const full = dashProfileValidate(dashProfilePatchCreate(value), otherSlugs)
    if (slugEditing.get()) return full
    const filtered: Record<string, string> = {}
    for (const [key, message] of Object.entries(full)) {
      if (key !== "slug") filtered[key] = message
    }
    return filtered
  }

  const touch = () => saveError.set(null)

  const setText = (
    key: "name" | "slug" | "subtitle" | "description" | "website" | "email" | "phone",
    value: string,
  ) => {
    const current = form.get()
    if (!current) return
    form.set({ ...current, [key]: value })
    touch()
  }

  const setLogo = (value: string | null) => {
    const current = form.get()
    if (!current) return
    form.set({ ...current, logoDataUrl: value })
    touch()
  }

  const setSocial = (network: DashSocialNetwork, value: string) => {
    const current = form.get()
    if (!current) return
    form.set({ ...current, socials: { ...current.socials, [network]: value } })
    touch()
  }

  const setImprint = (key: keyof DashProfileImprintForm, value: string) => {
    const current = form.get()
    if (!current) return
    form.set({ ...current, imprint: { ...current.imprint, [key]: value } })
    touch()
  }

  const discard = () => {
    const fresh = initial()
    if (fresh) form.set(fresh)
    saveError.set(null)
    slugEditing.set(false)
  }

  const save = () => {
    if (saving.get()) return
    const current = org()
    const value = form.get()
    if (!current || !value) return
    const otherSlugs = dashStateGet()
      .orgs.filter((entry) => entry.id !== current.id)
      .map((entry) => entry.slug)
    const validation = dashProfileValidate(dashProfilePatchCreate(value), otherSlugs)
    if (Object.keys(validation).length > 0) {
      if (validation["slug"]) slugEditing.set(true)
      return
    }
    saving.set(true)
    const result = dashOrgProfileUpdate({ orgId: current.id, patch: dashProfilePatchCreate(value) })
    saving.set(false)
    if (!result.success) {
      saveError.set(result.errorMessage)
      return
    }
    saveError.set(null)
    slugEditing.set(false)
    toastAdd({ title: "Profil gespeichert", variant: "success" })
  }

  return {
    org,
    canEdit,
    form,
    saving,
    saveError,
    slugEditing,
    dirty,
    liveErrors,
    setText,
    setLogo,
    setSocial,
    setImprint,
    discard,
    save,
  }
}

export type DashProfilePageState = ReturnType<typeof dashProfilePageStateCreate>
