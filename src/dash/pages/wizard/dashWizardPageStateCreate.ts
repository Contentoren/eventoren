import * as v from "valibot"
import { useNavigate } from "@tanstack/solid-router"
import { onMount } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import { toastAdd } from "#ui/interactive/toast/toastAdd.js"
import type { DashEventCategory } from "../../model/dashEventCategorySchema.ts"
import { dashCentsFormat } from "../../model/dashCentsFormat.ts"
import { dashDateFormat } from "../../model/dashDateFormat.ts"
import { dashEventPublicPath } from "../../model/dashEventPublicPath.ts"
import { dashFeeCompute } from "../../model/dashFeeCompute.ts"
import { dashActiveOrg } from "../../store/dashActiveOrg.ts"
import { dashStateGet } from "../../store/dashStateGet.ts"
import { dashEventCreateFromWizard } from "../../store/actions/wizard/dashEventCreateFromWizard.ts"
import { dashTemplateToWizard, type DashWizardTicketDraft } from "../../store/actions/wizard/dashTemplateToWizard.ts"
import { dashWizardDraftCreate, dashWizardDraftSchema } from "../../store/actions/wizard/dashWizardDraft.ts"

const wizardStorageKey = "eventoren-demo-wizard"

export type DashWizardCategory = DashEventCategory

export type DashWizardSuccess = {
  eventId: string
  published: boolean
  publishError: string | null
  publicPath: string
  publicUrl: string
}

const wizardTimeFormat = new Intl.DateTimeFormat("de-DE", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

function wizardShiftMinutes(iso: string, minutes: number): string | null {
  const parsed = Date.parse(iso)
  if (!Number.isFinite(parsed)) return null
  return new Date(parsed + minutes * 60_000).toISOString()
}

/** Zustand des 3-Schritte-Event-Assistenten: Entwurf, Validierung, Vorlagen und Speichern. */
export function dashWizardPageStateCreate(inputs: {
  step: () => number
  vorlage: () => string | undefined
  onStep: (step: number) => void
}) {
  const navigate = useNavigate()
  const initial = dashWizardDraftCreate(700)

  const title = createSignalObject(initial.title)
  const subtitle = createSignalObject(initial.subtitle)
  const category = createSignalObject<DashWizardCategory>(initial.category)
  const startsAt = createSignalObject<string | null>(initial.startsAt)
  const endsAt = createSignalObject<string | null>(initial.endsAt)
  const doorsAt = createSignalObject<string | null>(initial.doorsAt)
  const venueName = createSignalObject(initial.venueName)
  const venueStreet = createSignalObject(initial.venueStreet)
  const venueZip = createSignalObject(initial.venueZip)
  const venueCity = createSignalObject(initial.venueCity)
  const imageUrl = createSignalObject(initial.imageUrl)
  const imageAlt = createSignalObject(initial.imageAlt)
  const imageAltTouched = createSignalObject(initial.imageAltTouched)
  const description = createSignalObject(initial.description)
  const visibility = createSignalObject<"oeffentlich" | "nicht-gelistet">(initial.visibility)
  const tickets = createSignalObject<DashWizardTicketDraft[]>(initial.tickets)
  const showErrors = createSignalObject(false)
  const confirmCancel = createSignalObject(false)
  const dirty = createSignalObject(false)
  const saving = createSignalObject(false)
  const success = createSignalObject<DashWizardSuccess | null>(null)

  let templateApplied = false

  const org = () => dashActiveOrg()
  const fee = () => org()?.fee ?? { percentBps: 500, fixedCents: 129, payer: "kaeufer" as const }
  const defaultRate = (): 1900 | 700 => org()?.tax.defaultRateBps ?? 700
  const smallBusiness = () => org()?.tax.status === "klein"

  const markDirty = () => {
    dirty.set(true)
    wizardPersistSoon()
  }

  let persistTimer: ReturnType<typeof setTimeout> | null = null
  const snapshot = () => ({
    title: title.get(),
    subtitle: subtitle.get(),
    category: category.get(),
    startsAt: startsAt.get(),
    endsAt: endsAt.get(),
    doorsAt: doorsAt.get(),
    venueName: venueName.get(),
    venueStreet: venueStreet.get(),
    venueZip: venueZip.get(),
    venueCity: venueCity.get(),
    imageUrl: imageUrl.get(),
    imageAlt: imageAlt.get(),
    imageAltTouched: imageAltTouched.get(),
    description: description.get(),
    visibility: visibility.get(),
    tickets: tickets.get(),
  })

  function wizardPersistSoon() {
    if (typeof window === "undefined" || success.get() !== null) return
    if (persistTimer) clearTimeout(persistTimer)
    persistTimer = setTimeout(() => {
      persistTimer = null
      const write = () => {
        try {
          window.sessionStorage.setItem(wizardStorageKey, JSON.stringify(snapshot()))
        } catch {
          // Session-Storage voll oder blockiert – Entwurf bleibt nur im Speicher
        }
      }
      const idle = window.requestIdleCallback as unknown as ((fn: () => void) => void) | undefined
      if (typeof idle === "function") idle(write)
      else write()
    }, 300)
  }

  const restore = (draft: ReturnType<typeof snapshot>) => {
    title.set(draft.title)
    subtitle.set(draft.subtitle)
    category.set(draft.category)
    startsAt.set(draft.startsAt)
    endsAt.set(draft.endsAt)
    doorsAt.set(draft.doorsAt)
    venueName.set(draft.venueName)
    venueStreet.set(draft.venueStreet)
    venueZip.set(draft.venueZip)
    venueCity.set(draft.venueCity)
    imageUrl.set(draft.imageUrl)
    imageAlt.set(draft.imageAlt)
    imageAltTouched.set(draft.imageAltTouched)
    description.set(draft.description)
    visibility.set(draft.visibility)
    tickets.set(draft.tickets.length > 0 ? draft.tickets : dashWizardDraftCreate(defaultRate()).tickets)
  }

  const applyTemplate = (templateId: string) => {
    const template = dashStateGet().templates.find((candidate) => candidate.id === templateId)
    if (!template) return
    const base = startsAt.get()
    if (base && Number.isFinite(Date.parse(base))) {
      const draft = dashTemplateToWizard(template, base)
      title.set(draft.title)
      subtitle.set(draft.subtitle)
      category.set(draft.category)
      endsAt.set(draft.endsAt)
      doorsAt.set(draft.doorsAt)
      venueName.set(draft.venueName)
      venueStreet.set(draft.venueStreet)
      venueZip.set(draft.venueZip)
      venueCity.set(draft.venueCity)
      imageUrl.set(draft.imageUrl)
      imageAlt.set(draft.imageAlt)
      imageAltTouched.set(draft.imageAltTouched)
      description.set(draft.description)
      tickets.set(draft.tickets.length > 0 ? draft.tickets : tickets.get())
    } else {
      title.set(template.event.title)
      subtitle.set(template.event.subtitle)
      category.set(template.event.category)
      venueName.set(template.event.venue.name)
      venueStreet.set(template.event.venue.street)
      venueZip.set(template.event.venue.zip)
      venueCity.set(template.event.venue.city)
      imageUrl.set(template.event.imageUrl)
      imageAlt.set(template.event.imageAlt)
      imageAltTouched.set(template.event.imageAlt.trim().length > 0)
      description.set(template.event.description)
      const mapped: DashWizardTicketDraft[] = template.ticketTypes.map((type) => ({
        name: type.name,
        priceCents: type.phases[0]?.priceCents ?? 0,
        capacity: type.capacity,
        taxRateBps: type.taxRateBps,
        hidden: type.hidden,
        phasesExpanded: type.phases.length > 1,
        phases: type.phases.map((phase) => ({
          name: phase.name,
          priceCents: phase.priceCents,
          endsAt: null,
          quota: phase.quota,
        })),
      }))
      if (mapped.length > 0) tickets.set(mapped)
    }
    markDirty()
    toastAdd({
      title: `Vorlage „${template.name}“ übernommen`,
      description: "Wähle noch Datum und Uhrzeit.",
      variant: "success",
    })
  }

  onMount(() => {
    try {
      const raw = window.sessionStorage.getItem(wizardStorageKey)
      if (raw) {
        const parsed = v.safeParse(dashWizardDraftSchema, JSON.parse(raw) as unknown)
        if (parsed.success) {
          restore(parsed.output)
          dirty.set(true)
        }
      }
    } catch {
      // ungültiger Entwurf wird ignoriert
    }
    const templateId = inputs.vorlage()
    if (templateId && !templateApplied && !dirty.get()) {
      templateApplied = true
      applyTemplate(templateId)
    }
  })

  const basisErrors = () => {
    const errors: Record<string, string> = {}
    if (title.get().trim().length === 0) errors.title = "Bitte gib einen Titel ein."
    const start = startsAt.get()
    const end = endsAt.get()
    if (!start || !Number.isFinite(Date.parse(start))) errors.startsAt = "Bitte wähle Beginn-Datum und Uhrzeit."
    if (!end || !Number.isFinite(Date.parse(end))) errors.endsAt = "Bitte wähle das Ende."
    if (
      start &&
      end &&
      Number.isFinite(Date.parse(start)) &&
      Number.isFinite(Date.parse(end)) &&
      Date.parse(start) >= Date.parse(end)
    )
      errors.endsAt = "Das Ende muss nach dem Beginn liegen."
    if (venueName.get().trim().length === 0) errors.venueName = "Bitte gib einen Ort an."
    if (venueCity.get().trim().length === 0) errors.venueCity = "Bitte gib die Stadt an."
    if (imageUrl.get().trim().length === 0) errors.imageUrl = "Bitte wähle ein Titelbild."
    if (imageAlt.get().trim().length === 0) errors.imageAlt = "Der Alt-Text ist Pflicht – er hilft allen Gästen."
    return errors
  }

  const ticketErrors = () => {
    const rows = tickets.get()
    const errors: Record<string, string> = {}
    if (rows.length === 0) errors.tickets = "Lege mindestens eine Ticketart an."
    rows.forEach((row, index) => {
      if (row.name.trim().length === 0) errors[`ticket-${index}-name`] = "Jede Ticketart braucht einen Namen."
      if (!Number.isInteger(row.priceCents) || row.priceCents < 0)
        errors[`ticket-${index}-price`] = "Der Preis ist ungültig."
      if (!Number.isInteger(row.capacity) || row.capacity < 1)
        errors[`ticket-${index}-capacity`] = "Mindestens 1 Ticket."
      row.phases.forEach((phase, phaseIndex) => {
        if (phase.name.trim().length === 0)
          errors[`ticket-${index}-phase-${phaseIndex}-name`] = "Jede Phase braucht einen Namen."
        if (!Number.isInteger(phase.priceCents) || phase.priceCents < 0)
          errors[`ticket-${index}-phase-${phaseIndex}-price`] = "Der Phasenpreis ist ungültig."
      })
    })
    return errors
  }

  const basisValid = () => Object.keys(basisErrors()).length === 0
  const ticketsValid = () => Object.keys(ticketErrors()).length === 0

  const input = () => ({
    title: title.get().trim(),
    subtitle: subtitle.get(),
    category: category.get(),
    startsAt: startsAt.get() ?? "",
    endsAt: endsAt.get() ?? "",
    doorsAt: doorsAt.get(),
    venue: { name: venueName.get(), street: venueStreet.get(), zip: venueZip.get(), city: venueCity.get() },
    imageUrl: imageUrl.get(),
    imageAlt: imageAlt.get(),
    description: description.get(),
    faq: [],
    schedule: [],
    visibility: visibility.get(),
    ticketTypes: tickets.get().map((row) => ({
      name: row.name.trim(),
      priceCents: row.priceCents,
      capacity: row.capacity,
      taxRateBps: smallBusiness() ? defaultRate() : row.taxRateBps,
      hidden: row.hidden,
      phases: row.phases.map((phase) => ({
        name: phase.name,
        priceCents: phase.priceCents,
        endsAt: phase.endsAt,
        quota: phase.quota,
      })),
    })),
  })

  const persistClear = () => {
    try {
      window.sessionStorage.removeItem(wizardStorageKey)
    } catch {
      // ignorieren
    }
  }

  const finish = (eventId: string, published: boolean, publishError: string | null) => {
    const current = dashStateGet().events.find((event) => event.id === eventId)
    const active = org()
    const slug = current?.slug ?? "event"
    const path = active ? dashEventPublicPath(active.slug, slug) : `/demo/dashboard/events/${eventId}`
    success.set({
      eventId,
      published,
      publishError,
      publicPath: path,
      publicUrl: active ? `https://eventoren.de/veranstalter/${active.slug}/${slug}` : path,
    })
    dirty.set(false)
    persistClear()
  }

  const saveDraft = () => {
    if (saving.get()) return
    saving.set(true)
    try {
      const result = dashEventCreateFromWizard({ ...input(), publish: false })
      if (!result.success) {
        const failure = result as { success: boolean; error?: { message?: unknown } }
        const message =
          typeof failure.error?.message === "string" ? failure.error.message : "Speichern ist gerade nicht möglich."
        toastAdd({ title: "Entwurf konnte nicht gespeichert werden", description: message, variant: "error" })
        return
      }
      finish(result.data.event.id, false, null)
      toastAdd({ title: "Entwurf gespeichert", variant: "success" })
    } finally {
      saving.set(false)
    }
  }

  const publish = () => {
    if (saving.get()) return
    if (!basisValid()) {
      showErrors.set(true)
      inputs.onStep(0)
      return
    }
    if (!ticketsValid()) {
      showErrors.set(true)
      inputs.onStep(1)
      return
    }
    saving.set(true)
    try {
      const result = dashEventCreateFromWizard({ ...input(), publish: true })
      if (!result.success) {
        const failure = result as { success: boolean; error?: { message?: unknown } }
        const message =
          typeof failure.error?.message === "string"
            ? failure.error.message
            : "Veröffentlichen ist gerade nicht möglich."
        toastAdd({ title: "Veröffentlichen fehlgeschlagen", description: message, variant: "error" })
        return
      }
      finish(result.data.event.id, result.data.published, result.data.publishError)
      if (result.data.published) toastAdd({ title: "Dein Event ist online", variant: "success" })
      else
        toastAdd({
          title: "Als Entwurf gespeichert",
          description: result.data.publishError ?? undefined,
          variant: "success",
        })
    } finally {
      saving.set(false)
    }
  }

  const goStep = (next: number) => {
    if (next > inputs.step()) {
      if (inputs.step() === 0 && !basisValid()) {
        showErrors.set(true)
        return
      }
      if (inputs.step() === 1 && !ticketsValid()) {
        showErrors.set(true)
        return
      }
      showErrors.set(false)
    } else {
      showErrors.set(false)
    }
    inputs.onStep(next)
  }

  const cancelRequest = () => {
    if (dirty.get()) confirmCancel.set(true)
    else void navigate({ to: "/demo/dashboard/events" })
  }

  const cancelConfirm = () => {
    confirmCancel.set(false)
    persistClear()
    void navigate({ to: "/demo/dashboard/events" })
  }

  const setTitle = (value: string) => {
    title.set(value)
    if (!imageAltTouched.get()) imageAlt.set(value)
    markDirty()
  }

  const updateTicket = (index: number, patch: Partial<DashWizardTicketDraft>) => {
    tickets.set(tickets.get().map((row, current) => (current === index ? { ...row, ...patch } : row)))
    markDirty()
  }

  const addTicketRow = (row: DashWizardTicketDraft) => {
    tickets.set([...tickets.get(), row])
    markDirty()
  }

  const removeTicket = (index: number) => {
    if (tickets.get().length <= 1) {
      toastAdd({ title: "Mindestens eine Ticketart bleibt bestehen", variant: "error" })
      return
    }
    tickets.set(tickets.get().filter((_, current) => current !== index))
    markDirty()
  }

  const quickAdd = (kind: "standard" | "early" | "ermaessigt" | "kostenlos") => {
    const rate = smallBusiness() ? defaultRate() : defaultRate()
    if (kind === "standard")
      addTicketRow({
        name: "Standard",
        priceCents: 2500,
        capacity: 100,
        taxRateBps: rate,
        hidden: false,
        phasesExpanded: false,
        phases: [{ name: "Regulär", priceCents: 2500, endsAt: null, quota: null }],
      })
    if (kind === "early") {
      addTicketRow({
        name: "Early Bird",
        priceCents: 1900,
        capacity: 100,
        taxRateBps: rate,
        hidden: false,
        phasesExpanded: false,
        phases: [{ name: "Early Bird", priceCents: 1900, endsAt: null, quota: 100 }],
      })
      addTicketRow({
        name: "Regulär",
        priceCents: 2400,
        capacity: 200,
        taxRateBps: rate,
        hidden: false,
        phasesExpanded: false,
        phases: [{ name: "Regulär", priceCents: 2400, endsAt: null, quota: null }],
      })
    }
    if (kind === "ermaessigt")
      addTicketRow({
        name: "Ermäßigt",
        priceCents: 1600,
        capacity: 100,
        taxRateBps: rate,
        hidden: false,
        phasesExpanded: false,
        phases: [{ name: "Regulär", priceCents: 1600, endsAt: null, quota: null }],
      })
    if (kind === "kostenlos")
      addTicketRow({
        name: "Freikarte",
        priceCents: 0,
        capacity: 50,
        taxRateBps: rate,
        hidden: false,
        phasesExpanded: false,
        phases: [{ name: "Frei", priceCents: 0, endsAt: null, quota: null }],
      })
  }

  const setDoorsBefore = (minutes: number) => {
    const start = startsAt.get()
    if (!start) return
    doorsAt.set(wizardShiftMinutes(start, -minutes))
    markDirty()
  }

  const recentVenues = () => {
    const active = org()
    if (!active) return []
    const seen = new Map<string, { name: string; street: string; zip: string; city: string }>()
    for (const event of dashStateGet().events.filter((candidate) => candidate.orgId === active.id)) {
      const key = `${event.venue.name} · ${event.venue.city}`
      if (!seen.has(key)) seen.set(key, { ...event.venue })
    }
    return [...seen.values()].slice(0, 4)
  }

  const feeLine = (priceCents: number) => {
    const computed = dashFeeCompute({ priceCents, fee: fee() })
    return `Käufer zahlt ${dashCentsFormat(computed.buyerPaysCents)} · Du erhältst ${dashCentsFormat(computed.organizerGetsCents)}`
  }

  const previewDate = () => {
    const start = startsAt.get()
    if (!start || !Number.isFinite(Date.parse(start))) return null
    return dashDateFormat(start, "kurz")
  }

  const previewTime = () => {
    const start = startsAt.get()
    if (!start || !Number.isFinite(Date.parse(start))) return null
    return wizardTimeFormat.format(new Date(start))
  }

  const checklist = () => {
    const basis = basisValid()
    const bild = imageUrl.get().trim().length > 0
    const alt = imageAlt.get().trim().length > 0
    const ticketsDone = ticketsValid() && tickets.get().length > 0
    const beschreibung = description.get().trim().length > 0
    const organisation = org()?.status === "aktiv"
    return [
      { id: "basis", label: "Basisdaten", done: basis, required: true },
      { id: "bild", label: "Titelbild", done: bild, required: true },
      { id: "alt", label: "Alt-Text", done: alt, required: true },
      { id: "tickets", label: "Ticketarten", done: ticketsDone, required: true },
      {
        id: "beschreibung",
        label: beschreibung ? "Beschreibung" : "Keine Beschreibung — später ergänzen",
        done: beschreibung,
        required: false,
      },
      { id: "org", label: "Organisation freigegeben", done: organisation, required: true },
    ]
  }

  const openEvent = () => {
    const current = success.get()
    if (!current) return
    void navigate({ to: `/demo/dashboard/events/${current.eventId}` as never })
  }

  return {
    step: inputs.step,
    title,
    subtitle,
    category,
    startsAt,
    endsAt,
    doorsAt,
    venueName,
    venueStreet,
    venueZip,
    venueCity,
    imageUrl,
    imageAlt,
    imageAltTouched,
    description,
    visibility,
    tickets,
    showErrors,
    confirmCancel,
    dirty,
    saving,
    success,
    org,
    fee,
    defaultRate,
    smallBusiness,
    basisErrors,
    ticketErrors,
    basisValid,
    ticketsValid,
    setTitle,
    updateTicket,
    addTicketRow,
    removeTicket,
    quickAdd,
    setDoorsBefore,
    recentVenues,
    feeLine,
    previewDate,
    previewTime,
    checklist,
    goStep,
    cancelRequest,
    cancelConfirm,
    saveDraft,
    publish,
    openEvent,
    markDirty,
  }
}

export type DashWizardPageState = ReturnType<typeof dashWizardPageStateCreate>
