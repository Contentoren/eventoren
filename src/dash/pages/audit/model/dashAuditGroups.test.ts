import { describe, expect, test } from "bun:test"

import type { DashAuditEntry } from "../../../model/dashAuditEntrySchema.ts"
import { dashAuditEntriesForScope, dashAuditFilterMeta, dashAuditGroupsCreate } from "./dashAuditGroups.ts"

function entry(overrides: Partial<DashAuditEntry> & { id: string }): DashAuditEntry {
  return {
    orgId: "org-lindenhof",
    eventId: null,
    at: "2026-10-18T10:00:00.000Z",
    actor: "Mara Lindner",
    area: "tickets",
    action: "Preis geändert",
    before: null,
    after: null,
    ...overrides,
  }
}

describe("dashAuditGroups", () => {
  test("gruppiert nach Berliner Tag mit Heute und Gestern zuerst", () => {
    const now = new Date("2026-10-18T12:00:00.000Z")
    const entries = [
      entry({ id: "a1", at: "2026-10-18T08:00:00.000Z" }),
      entry({ id: "a2", at: "2026-10-17T20:00:00.000Z", actor: "Jonas Weber" }),
      entry({ id: "a3", at: "2026-10-15T08:00:00.000Z", area: "event" }),
      entry({ id: "a4", orgId: "org-anders", at: "2026-10-18T09:00:00.000Z" }),
    ]
    const groups = dashAuditGroupsCreate(entries, { orgId: "org-lindenhof" }, now)
    expect(groups.map((group) => group.label)).toEqual(["Heute", "Gestern", groups[2]?.label as string])
    expect(groups[0]?.entries.map((item) => item.id)).toEqual(["a1"])
    expect(groups[1]?.entries.map((item) => item.id)).toEqual(["a2"])
    expect(groups[2]?.label).toContain("Okt.")
  })

  test("filtert nach Bereich und Person und zählt nur vorhandene", () => {
    const now = new Date("2026-10-18T12:00:00.000Z")
    const entries = [
      entry({ id: "a1", area: "tickets", actor: "Mara Lindner" }),
      entry({ id: "a2", area: "event", actor: "Mara Lindner" }),
      entry({ id: "a3", area: "event", actor: "Jonas Weber" }),
    ]
    const meta = dashAuditFilterMeta(entries)
    expect(meta.areas).toEqual([
      { area: "event", count: 2 },
      { area: "tickets", count: 1 },
    ])
    expect(meta.actors).toEqual([
      { actor: "Mara Lindner", count: 2 },
      { actor: "Jonas Weber", count: 1 },
    ])
    const filtered = dashAuditGroupsCreate(entries, { orgId: "org-lindenhof", area: "event" }, now)
    expect(filtered.flatMap((group) => group.entries).map((item) => item.id)).toEqual(["a2", "a3"])
    const byPerson = dashAuditGroupsCreate(entries, { orgId: "org-lindenhof", person: "Jonas Weber" }, now)
    expect(byPerson.flatMap((group) => group.entries).map((item) => item.id)).toEqual(["a3"])
  })

  test("grenzt auf ein Event ein und sortiert neueste zuerst", () => {
    const entries = [
      entry({ id: "a1", eventId: "ev-jazz-wein", at: "2026-10-16T08:00:00.000Z" }),
      entry({ id: "a2", eventId: "ev-jazz-wein", at: "2026-10-18T08:00:00.000Z" }),
      entry({ id: "a3", eventId: "ev-sommernacht", at: "2026-10-18T09:00:00.000Z" }),
    ]
    const scoped = dashAuditEntriesForScope(entries, { orgId: "org-lindenhof", eventId: "ev-jazz-wein" })
    expect(scoped.map((item) => item.id)).toEqual(["a2", "a1"])
  })
})
