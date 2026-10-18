import { adminEventReleaseDateTimeToIso } from "../../../admin/adminEventReleaseDateTimeToIso.ts"
import type { DashVoucher } from "../../model/dashVoucherSchema.ts"

import { dashSeedTimeAt } from "./dashSeedTimeAt.ts"

function berlinYearEndIso(createdAt: string, yearsAfter: number): string {
  const berlinYear = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric" }).format(
    new Date(createdAt),
  )
  return `${Number(berlinYear) + yearsAfter}-12-31T22:59:59.999Z`
}

function berlinSameDateYearsLater(createdAt: string, yearsAfter: number): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(createdAt))
  const part = (type: string) => parts.find((entry) => entry.type === type)?.value ?? ""
  const wall = `${Number(part("year")) + yearsAfter}-${part("month")}-${part("day")}T23:59`
  const result = adminEventReleaseDateTimeToIso(wall)
  if (!result.success) throw new Error(`dashSeedVouchers: ungueltiges Datum ${wall}`)
  return result.data
}

export function dashSeedVouchers(now: Date): DashVoucher[] {
  const minted1 = dashSeedTimeAt(now, -200, "11:00")
  const minted2 = dashSeedTimeAt(now, -90, "14:00")
  const minted3 = dashSeedTimeAt(now, -40, "16:00")
  const minted4 = dashSeedTimeAt(now, -20, "12:00")
  const minted5 = dashSeedTimeAt(now, -10, "09:00")
  const minted6 = dashSeedTimeAt(now, -2, "18:00")
  return [
    {
      id: "vou-geburtstag-50",
      orgId: "org-lindenhof",
      code: "HOF-50-AMLX",
      initialCents: 5000,
      balanceCents: 5000,
      kind: "verkauft",
      recipientName: "Familie Berger",
      recipientEmail: "familie.berger@example.de",
      message: "Zum Geburtstag – viel Freude im Lindenhof!",
      validity: "3-jahre-jahresende",
      expiresAt: berlinYearEndIso(minted1, 3),
      status: "aktiv",
      createdAt: minted1,
      redemptions: [],
    },
    {
      id: "vou-danke-100",
      orgId: "org-lindenhof",
      code: "HOF-100-DANK",
      initialCents: 10000,
      balanceCents: 10000,
      kind: "verkauft",
      recipientName: "Jonas Weber",
      recipientEmail: "jonas@example.de",
      message: "Danke für deine Hilfe beim Sommerfest!",
      validity: "3-jahre-jahresende",
      expiresAt: berlinYearEndIso(minted2, 3),
      status: "aktiv",
      createdAt: minted2,
      redemptions: [],
    },
    {
      id: "vou-weihnachten-25",
      orgId: "org-lindenhof",
      code: "HOF-25-WNCH",
      initialCents: 2500,
      balanceCents: 2500,
      kind: "kostenlos",
      recipientName: "Aylin Demir",
      recipientEmail: "aylin@example.de",
      message: "Frohe Weihnachten vom Lindenhof-Team!",
      validity: "3-jahre-jahresende",
      expiresAt: berlinYearEndIso(minted3, 3),
      status: "aktiv",
      createdAt: minted3,
      redemptions: [],
    },
    {
      id: "vou-jubilaeum-50",
      orgId: "org-lindenhof",
      code: "HOF-50-JUBL",
      initialCents: 5000,
      balanceCents: 5000,
      kind: "verkauft",
      recipientName: "Ehepaar Krüger",
      recipientEmail: "krueger@example.de",
      message: "Zur goldenen Hochzeit!",
      validity: "2-jahre",
      expiresAt: berlinSameDateYearsLater(minted4, 2),
      status: "aktiv",
      createdAt: minted4,
      redemptions: [],
    },
    {
      id: "vou-deaktiviert-25",
      orgId: "org-lindenhof",
      code: "HOF-25-ALT9",
      initialCents: 2500,
      balanceCents: 2500,
      kind: "verkauft",
      recipientName: "Unbekannt",
      recipientEmail: "unbekannt@example.de",
      message: "Alte Charge, ersetzt durch neue Codes.",
      validity: "1-jahr",
      expiresAt: berlinSameDateYearsLater(minted5, 1),
      status: "deaktiviert",
      createdAt: minted5,
      redemptions: [],
    },
    {
      id: "vou-foerder-100",
      orgId: "org-lindenhof",
      code: "HOF-100-FRDV",
      initialCents: 10000,
      balanceCents: 10000,
      kind: "kostenlos",
      recipientName: "Förderverein Lindenhof",
      recipientEmail: "foerderverein@kulturhaus-lindenhof.de",
      message: "Für ehrenamtliche Helfer:innen – unbegrenzt gültig.",
      validity: "unbegrenzt",
      expiresAt: null,
      status: "aktiv",
      createdAt: minted6,
      redemptions: [],
    },
  ]
}
