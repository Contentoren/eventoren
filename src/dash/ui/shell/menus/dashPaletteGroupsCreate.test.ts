import { describe, expect, test } from "bun:test"
import { dashRolePermissions } from "../../../model/dashRolePermissions.ts"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashPaletteGroupsCreate } from "./dashPaletteGroupsCreate.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

function paletteCreate(
  role: "inhaber" | "einlass",
  query: string,
  currentEventId: string | null = "ev-jazz-wein",
): { groups: ReturnType<typeof dashPaletteGroupsCreate>; navigated: string[]; counter: { themed: number } } {
  const navigated: string[] = []
  const counter = { themed: 0 }
  const groups = dashPaletteGroupsCreate({
    state: dashSeedCreate(fixedNow),
    orgId: "org-lindenhof",
    permissions: dashRolePermissions(role),
    query,
    currentEventId,
    navigate: (to) => navigated.push(to),
    toggleTheme: () => {
      counter.themed += 1
    },
  })
  return { groups, navigated, counter }
}

function groupLabels(groups: ReturnType<typeof dashPaletteGroupsCreate>, id: string): string[] {
  return groups.find((group) => group.id === id)?.items.map((item) => item.label) ?? []
}

describe("dashPaletteGroupsCreate", () => {
  test("Inhaber sieht alle Org-Seiten, Event-Unterseiten und alle Aktionen", () => {
    const { groups, navigated } = paletteCreate("inhaber", "")
    expect(groups.map((group) => group.id)).toEqual(["aktionen", "seiten", "events"])
    expect(groupLabels(groups, "seiten")).toContain("Finanzen")
    expect(groupLabels(groups, "seiten")).toContain("Bestellungen")
    const jazzBestellungen = groups
      .find((group) => group.id === "seiten")
      ?.items.find((item) => item.id === "seite-event-ev-jazz-wein-/demo/dashboard/events/ev-jazz-wein/bestellungen")
    expect(jazzBestellungen?.description).toBe("Jazz & Wein")
    jazzBestellungen?.onSelect()
    expect(navigated).toEqual(["/demo/dashboard/events/ev-jazz-wein/bestellungen"])
    expect(groupLabels(groups, "aktionen")).toEqual([
      "Event erstellen",
      "Code erstellen",
      "Gast hinzufügen",
      "Nachricht schreiben",
      "Hell/Dunkel umschalten",
    ])
    const jazz = groups.find((group) => group.id === "events")?.items.find((item) => item.id === "event-ev-jazz-wein")
    expect(jazz?.description).toContain("Gartensaal")
    expect(jazz?.keywords).toContain("Leipzig")
  })

  test("Einlass sieht keine Finanzen und nur erlaubte Aktionen", () => {
    const { groups, navigated, counter } = paletteCreate("einlass", "")
    expect(groupLabels(groups, "seiten")).toEqual([
      "Übersicht",
      "Events",
      "Übersicht",
      "Teilnehmer",
      "Gästeliste",
      "Einlass",
      "Abendkasse",
    ])
    expect(groupLabels(groups, "aktionen")).toEqual(["Gast hinzufügen", "Hell/Dunkel umschalten"])
    const gast = groups
      .find((group) => group.id === "aktionen")
      ?.items.find((item) => item.id === "aktion-gast-hinzufuegen")
    gast?.onSelect()
    expect(navigated).toEqual(["/demo/dashboard/events/ev-jazz-wein/gaesteliste?gast=neu"])
    const theme = groups
      .find((group) => group.id === "aktionen")
      ?.items.find((item) => item.id === "aktion-theme-umschalten")
    theme?.onSelect()
    expect(counter.themed).toBe(1)
  })

  test("Bestellungssuche findet per Nummer und verlinkt auf die Event-Bestellung", () => {
    const state = dashSeedCreate(fixedNow)
    const target = state.orders.find((order) => order.orgId === "org-lindenhof")
    if (!target) throw new Error("Seed-Bestellung fehlt")
    const navigated: string[] = []
    const groups = dashPaletteGroupsCreate({
      state,
      orgId: "org-lindenhof",
      permissions: dashRolePermissions("inhaber"),
      query: target.number,
      currentEventId: null,
      navigate: (to) => navigated.push(to),
      toggleTheme: () => {},
    })
    const orders = groups.find((group) => group.id === "bestellungen")
    expect(orders?.items.map((item) => item.label)).toContain(target.number)
    const entry = orders?.items.find((item) => item.label === target.number)
    entry?.onSelect()
    expect(navigated).toEqual([`/demo/dashboard/events/${target.eventId}/bestellungen?bestellung=${target.id}`])
  })

  test("Bestellungssuche findet per Käufername und braucht mindestens 2 Zeichen", () => {
    const state = dashSeedCreate(fixedNow)
    const target = state.orders.find((order) => order.orgId === "org-lindenhof")
    if (!target) throw new Error("Seed-Bestellung fehlt")
    const byName = dashPaletteGroupsCreate({
      state,
      orgId: "org-lindenhof",
      permissions: dashRolePermissions("inhaber"),
      query: target.buyer.lastName,
      currentEventId: null,
      navigate: () => {},
      toggleTheme: () => {},
    })
    expect(byName.find((group) => group.id === "bestellungen")?.items.length).toBeGreaterThan(0)
    const byShort = dashPaletteGroupsCreate({
      state,
      orgId: "org-lindenhof",
      permissions: dashRolePermissions("inhaber"),
      query: "x",
      currentEventId: null,
      navigate: () => {},
      toggleTheme: () => {},
    })
    expect(byShort.some((group) => group.id === "bestellungen")).toBe(false)
  })

  test("Query filtert Seiten und Events", () => {
    const { groups } = paletteCreate("inhaber", "finanzen")
    expect(groups.map((group) => group.id)).toEqual(["seiten"])
    expect(groupLabels(groups, "seiten")).toEqual(["Finanzen"])
  })

  test("Leere Suche zeigt Aktionen zuerst mit max. 5 Einträgen, Query behält Relevanz-Reihenfolge", () => {
    const leer = paletteCreate("inhaber", "").groups
    expect(leer.map((group) => group.id)).toEqual(["aktionen", "seiten", "events"])
    const aktionenLeer = groupLabels(leer, "aktionen")
    expect(aktionenLeer).toEqual([
      "Event erstellen",
      "Code erstellen",
      "Gast hinzufügen",
      "Nachricht schreiben",
      "Hell/Dunkel umschalten",
    ])
    expect(aktionenLeer.length).toBeLessThanOrEqual(5)
    const query = paletteCreate("inhaber", "gast").groups
    expect(query.map((group) => group.id)).toContain("aktionen")
    expect(query.map((group) => group.id).indexOf("seiten")).toBeLessThan(
      query.map((group) => group.id).indexOf("aktionen"),
    )
    expect(groupLabels(query, "aktionen")).toEqual(["Gast hinzufügen"])
  })
})
