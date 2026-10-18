import type { DashState } from "../../model/dashStateSchema.ts"

import { dashSeedCodes } from "./dashSeedCodes.ts"
import { dashSeedEvents } from "./dashSeedEvents.ts"
import { dashSeedGuestQuotas } from "./dashSeedGuestQuotas.ts"
import { dashSeedMembers } from "./dashSeedMembers.ts"
import { dashSeedMessages } from "./dashSeedMessages.ts"
import { dashSeedOrdersApply } from "./dashSeedOrdersApply.ts"
import { dashSeedRestApply } from "./dashSeedRestApply.ts"
import { dashSeedOrgs } from "./dashSeedOrgs.ts"
import { dashSeedScannerLinks } from "./dashSeedScannerLinks.ts"
import { dashSeedTemplates } from "./dashSeedTemplates.ts"
import { dashSeedTicketTypes } from "./dashSeedTicketTypes.ts"
import { dashSeedUsers } from "./dashSeedUsers.ts"
import { dashSeedVouchers } from "./dashSeedVouchers.ts"

function dashBerlinDateOnly(now: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
}

export function dashSeedCreate(now: Date): DashState {
  const master: DashState = {
    version: 1,
    seededAt: now.toISOString(),
    seedDay: dashBerlinDateOnly(now),
    session: { userId: "user-mara", activeOrgId: "org-lindenhof", simulatedRole: null },
    users: dashSeedUsers(),
    orgs: dashSeedOrgs(now),
    members: dashSeedMembers(now),
    events: dashSeedEvents(now),
    ticketTypes: dashSeedTicketTypes(now),
    codes: dashSeedCodes(now),
    vouchers: dashSeedVouchers(now),
    orders: [],
    tickets: [],
    guestQuotas: dashSeedGuestQuotas(),
    guests: [],
    scans: [],
    scannerLinks: dashSeedScannerLinks(now),
    messages: dashSeedMessages(now),
    templates: dashSeedTemplates(now),
    payouts: [],
    boxOfficeSales: [],
    audit: [],
  }
  // Kompositionsstelle für B4b/B4c: Bestellungen, Tickets, Scans, Gäste,
  // Abendkasse-Verkäufe, Auszahlungen und Protokoll füllen spätere
  // Seed-Funktionen auf (z. B. `return dashSeedOrdersApply(master, now)`).
  return dashSeedRestApply(dashSeedOrdersApply(master, now), now)
}
