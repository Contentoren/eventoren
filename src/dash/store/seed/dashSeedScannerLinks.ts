import type { DashScannerLink } from "../../model/dashScannerLinkSchema.ts"

import { dashSeedTimeAt } from "./dashSeedTimeAt.ts"

export function dashSeedScannerLinks(now: Date): DashScannerLink[] {
  const created = dashSeedTimeAt(now, -2, "10:00")
  return [
    {
      id: "scanlink-nord",
      eventId: "ev-indie-night",
      label: "Einlass Nord",
      entrance: "Haupteingang",
      token: "nord-7f3a2c9e1b",
      createdAt: created,
      lastUsedAt: dashSeedTimeAt(now, 0, "18:45"),
      revokedAt: null,
    },
    {
      id: "scanlink-hof",
      eventId: "ev-indie-night",
      label: "Einlass Hof",
      entrance: "Seiteneingang",
      token: "hof-4d8b1e6a2c",
      createdAt: created,
      lastUsedAt: dashSeedTimeAt(now, 0, "18:30"),
      revokedAt: null,
    },
    {
      id: "scanlink-test-alt",
      eventId: "ev-indie-night",
      label: "Testgerät Abend",
      entrance: "Abendkasse",
      token: "alt-9c2e5a1f7d",
      createdAt: dashSeedTimeAt(now, -10, "10:00"),
      lastUsedAt: dashSeedTimeAt(now, -5, "20:15"),
      revokedAt: dashSeedTimeAt(now, -4, "09:00"),
    },
  ]
}
