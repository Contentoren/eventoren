import { dashRandomCreate } from "../../model/dashRandomCreate.ts"
import type { DashAuditEntry } from "../../model/dashAuditEntrySchema.ts"
import type { DashState } from "../../model/dashStateSchema.ts"

const seedConstant = 20261022

type AuditDraft = {
  orgId: string
  eventId: string | null
  daysAgo: number
  actor: string
  area: DashAuditEntry["area"]
  action: string
  before: string | null
  after: string | null
}

const lindenhofDrafts: AuditDraft[] = [
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 29,
    actor: "Mara Lindner",
    area: "tickets",
    action: "Preis von Stehplatz · Regulär geändert",
    before: "24,00 €",
    after: "26,00 €",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 27,
    actor: "Jonas Weber",
    area: "tickets",
    action: "Kapazität von Stehplatz erhöht",
    before: "450 Plätze",
    after: "480 Plätze",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    daysAgo: 25,
    actor: "Mara Lindner",
    area: "codes",
    action: "Code JAZZ10 erstellt",
    before: null,
    after: "10 % Rabatt, max. 50 Tickets",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    daysAgo: 23,
    actor: "Jonas Weber",
    area: "event",
    action: "Event Jazz & Wein veröffentlicht",
    before: "Entwurf",
    after: "Veröffentlicht",
  },
  {
    orgId: "org-lindenhof",
    eventId: null,
    daysAgo: 21,
    actor: "Mara Lindner",
    area: "team",
    action: "Teammitglied eingeladen",
    before: null,
    after: "Jonas Weber (Einlass)",
  },
  {
    orgId: "org-lindenhof",
    eventId: null,
    daysAgo: 19,
    actor: "Aylin Demir",
    area: "profil",
    action: "Organisationsprofil aktualisiert",
    before: "Alte IBAN",
    after: "Neue IBAN",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-sommernacht",
    daysAgo: 17,
    actor: "Mara Lindner",
    area: "tickets",
    action: "Preis von Standard geändert",
    before: "20,00 €",
    after: "22,00 €",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-poetry-slam",
    daysAgo: 15,
    actor: "Jonas Weber",
    area: "tickets",
    action: "Kapazität von Standard erhöht",
    before: "180 Plätze",
    after: "200 Plätze",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    daysAgo: 14,
    actor: "Mara Lindner",
    area: "codes",
    action: "Code FREUNDE5 erstellt",
    before: null,
    after: "5 € Rabatt für Newsletter",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 12,
    actor: "Aylin Demir",
    area: "event",
    action: "Event Indie Night veröffentlicht",
    before: "Entwurf",
    after: "Veröffentlicht",
  },
  {
    orgId: "org-lindenhof",
    eventId: null,
    daysAgo: 11,
    actor: "Jonas Weber",
    area: "team",
    action: "Teammitglied eingeladen",
    before: null,
    after: "Aylin Demir (Abendkasse)",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-winterball",
    daysAgo: 10,
    actor: "Mara Lindner",
    area: "codes",
    action: "Code WINTER15 erstellt",
    before: null,
    after: "15 % Early-Bird-Rabatt",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-sommernacht",
    daysAgo: 9,
    actor: "Jonas Weber",
    area: "bestellungen",
    action: "Bestellung EV-260142 erstattet",
    before: "Bezahlt",
    after: "Erstattet",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-poetry-slam",
    daysAgo: 8,
    actor: "Mara Lindner",
    area: "tickets",
    action: "Preis von Standard · Ermäßigt geändert",
    before: "10,00 €",
    after: "12,00 €",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 7,
    actor: "Jonas Weber",
    area: "gaesteliste",
    action: "Gästeliste freigegeben",
    before: "Entwurf",
    after: "25 Plätze",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-winterball",
    daysAgo: 6,
    actor: "Mara Lindner",
    area: "event",
    action: "Event Winterball veröffentlicht",
    before: "Entwurf",
    after: "Veröffentlicht",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 5,
    actor: "Aylin Demir",
    area: "abendkasse",
    action: "Abendkasse geöffnet",
    before: "Geschlossen",
    after: "50 Tickets, 28,00 €",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    daysAgo: 4,
    actor: "Jonas Weber",
    area: "nachrichten",
    action: "Erinnerung geplant",
    before: null,
    after: "24 Stunden vorher",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-poetry-slam",
    daysAgo: 3,
    actor: "Mara Lindner",
    area: "bestellungen",
    action: "Bestellung EV-260388 erstattet",
    before: "Bezahlt",
    after: "Teilerstattet",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 2,
    actor: "Jonas Weber",
    area: "einlass",
    action: "Scannerzugang erstellt",
    before: null,
    after: "Einlass Nord",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-sommernacht",
    daysAgo: 1,
    actor: "Mara Lindner",
    area: "codes",
    action: "Code SOMMER5 deaktiviert",
    before: "Aktiv",
    after: "Deaktiviert",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-winterball",
    daysAgo: 0,
    actor: "Aylin Demir",
    area: "profil",
    action: "Beschreibung aktualisiert",
    before: "Alte Beschreibung",
    after: "Winterball mit Bigband",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-indie-night",
    daysAgo: 0,
    actor: "Jonas Weber",
    area: "einlass",
    action: "Einlass geöffnet",
    before: "Geschlossen",
    after: "Haupteingang und Seiteneingang",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-sommernacht",
    daysAgo: 13,
    actor: "Aylin Demir",
    area: "bestellungen",
    action: "Bestellung EV-260201 erstattet",
    before: "Bezahlt",
    after: "Erstattet",
  },
  {
    orgId: "org-lindenhof",
    eventId: "ev-jazz-wein",
    daysAgo: 16,
    actor: "Mara Lindner",
    area: "tickets",
    action: "Kapazität von Kategorie B erhöht",
    before: "60 Plätze",
    after: "70 Plätze",
  },
]

const abikurDrafts: AuditDraft[] = [
  {
    orgId: "org-abikur",
    eventId: "ev-abi-warmup",
    daysAgo: 20,
    actor: "Jonas Weber",
    area: "codes",
    action: "Code ABI-12A erstellt",
    before: null,
    after: "Klasse 12a, max. 60 Tickets",
  },
  {
    orgId: "org-abikur",
    eventId: "ev-abi-warmup",
    daysAgo: 12,
    actor: "Mara Lindner",
    area: "tickets",
    action: "Preis von Standard · Regulär geändert",
    before: "10,00 €",
    after: "12,00 €",
  },
  {
    orgId: "org-abikur",
    eventId: "ev-abiball-2027",
    daysAgo: 9,
    actor: "Aylin Demir",
    area: "event",
    action: "Event Abiball 2027 veröffentlicht",
    before: "Entwurf",
    after: "Veröffentlicht",
  },
  {
    orgId: "org-abikur",
    eventId: null,
    daysAgo: 4,
    actor: "Jonas Weber",
    area: "team",
    action: "Teammitglied eingeladen",
    before: null,
    after: "Lea Schneider (Orga)",
  },
  {
    orgId: "org-abikur",
    eventId: "ev-abi-warmup",
    daysAgo: 1,
    actor: "Mara Lindner",
    area: "bestellungen",
    action: "Bestellung EV-265011 erstattet",
    before: "Bezahlt",
    after: "Erstattet",
  },
]

/**
 * Seedet das Prüfprotokoll mit realistischen Aktionen.
 * Deterministisch über `dashRandomCreate` mit fester Konstante.
 */
export function dashSeedAuditApply(state: DashState, now: Date): DashState {
  const random = dashRandomCreate(seedConstant)
  void random
  const drafts = [...lindenhofDrafts, ...abikurDrafts]
  const audit: DashAuditEntry[] = drafts.map((draft, index) => {
    const at = new Date(
      now.getTime() - draft.daysAgo * 86_400_000 - Math.floor(((index * 37) % 20) + 1) * 3_600_000,
    ).toISOString()
    return {
      id: `audit-seed-${String(index + 1).padStart(3, "0")}`,
      orgId: draft.orgId,
      eventId: draft.eventId,
      at,
      actor: draft.actor,
      area: draft.area,
      action: draft.action,
      before: draft.before,
      after: draft.after,
    }
  })
  audit.sort((left, right) => Date.parse(left.at) - Date.parse(right.at))
  return { ...state, audit }
}
