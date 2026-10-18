import type { DashEvent } from "../../model/dashEventSchema.ts"

export interface DashDetailsErrors {
  title: string | null
  timing: string | null
  doors: string | null
  venueName: string | null
  venueCity: string | null
  imageAlt: string | null
  description: string | null
}

export interface DashDetailsDraft {
  title: string
  subtitle: string
  category: DashEvent["category"]
  startsAt: string | null
  endsAt: string | null
  doorsAt: string | null
  venueName: string
  venueStreet: string
  venueZip: string
  venueCity: string
  imageUrl: string
  imageAlt: string
  description: string
  schedule: DashEvent["schedule"]
  faq: DashEvent["faq"]
  visibility: DashEvent["visibility"]
  salesPaused: boolean
}

export function dashDetailsDraftFrom(event: DashEvent): DashDetailsDraft {
  return {
    title: event.title,
    subtitle: event.subtitle,
    category: event.category,
    startsAt: event.startsAt,
    endsAt: event.endsAt,
    doorsAt: event.doorsAt,
    venueName: event.venue.name,
    venueStreet: event.venue.street,
    venueZip: event.venue.zip,
    venueCity: event.venue.city,
    imageUrl: event.imageUrl,
    imageAlt: event.imageAlt,
    description: event.description,
    schedule: event.schedule.map((item) => ({ ...item })),
    faq: event.faq.map((item) => ({ ...item })),
    visibility: event.visibility,
    salesPaused: event.salesPaused,
  }
}

export function dashDetailsPatchFrom(draft: DashDetailsDraft): Partial<DashEvent> {
  return {
    title: draft.title.trim(),
    subtitle: draft.subtitle.trim(),
    category: draft.category,
    startsAt: draft.startsAt ?? "",
    endsAt: draft.endsAt ?? "",
    doorsAt: draft.doorsAt,
    venue: {
      name: draft.venueName.trim(),
      street: draft.venueStreet.trim(),
      zip: draft.venueZip.trim(),
      city: draft.venueCity.trim(),
    },
    imageUrl: draft.imageUrl,
    imageAlt: draft.imageAlt.trim(),
    description: draft.description,
    schedule: draft.schedule.map((item) => ({ ...item })),
    faq: draft.faq.map((item) => ({ ...item })),
    visibility: draft.visibility,
    salesPaused: draft.salesPaused,
  }
}

function msOf(iso: string | null): number | null {
  if (!iso) return null
  const ms = new Date(iso).getTime()
  return Number.isNaN(ms) ? null : ms
}

/** Validiert den Details-Entwurf: Titel, Zeiten, Ort, Alt-Text und Beschreibung. */
export function dashDetailsValidate(draft: DashDetailsDraft): DashDetailsErrors {
  const title = draft.title.trim()
  const titleError =
    title.length < 3 || title.length > 120 ? "Gib deinem Event einen Titel mit 3 bis 120 Zeichen." : null

  const startsMs = msOf(draft.startsAt)
  const endsMs = msOf(draft.endsAt)
  const doorsMs = msOf(draft.doorsAt)
  const timingError =
    startsMs === null || endsMs === null
      ? "Lege Beginn und Ende deines Events fest."
      : endsMs <= startsMs
        ? "Das Ende muss nach dem Beginn liegen."
        : null
  const doorsError =
    doorsMs !== null && startsMs !== null && doorsMs > startsMs ? "Der Einlass muss vor dem Beginn liegen." : null

  const venueNameError = draft.venueName.trim() === "" ? "Benenne deinen Veranstaltungsort." : null
  const venueCityError = draft.venueCity.trim() === "" ? "Nenne die Stadt deines Events." : null

  const imageAltError =
    draft.imageUrl !== "" && draft.imageAlt.trim() === "" ? "Alt-Text ist Pflicht für Barrierefreiheit." : null

  const descriptionError =
    draft.description.length > 3000 ? "Deine Beschreibung ist zu lang (max. 3000 Zeichen)." : null

  return {
    title: titleError,
    timing: timingError,
    doors: doorsError,
    venueName: venueNameError,
    venueCity: venueCityError,
    imageAlt: imageAltError,
    description: descriptionError,
  }
}

const errorOrder: (keyof DashDetailsErrors)[] = [
  "title",
  "timing",
  "doors",
  "venueName",
  "venueCity",
  "imageAlt",
  "description",
]

/** Erste fehlerhafte Details-Sektion (Anchor-ID) für das Scrollen zum Fehler. */
export function dashDetailsFirstErrorSection(errors: DashDetailsErrors): string | null {
  for (const key of errorOrder) {
    if (errors[key] === null) continue
    if (key === "title" || key === "timing" || key === "doors") return "basis"
    if (key === "venueName" || key === "venueCity") return "ort"
    if (key === "imageAlt") return "bild"
    return "beschreibung"
  }
  return null
}

export function dashDetailsErrorCount(errors: DashDetailsErrors): number {
  return errorOrder.filter((key) => errors[key] !== null).length
}
