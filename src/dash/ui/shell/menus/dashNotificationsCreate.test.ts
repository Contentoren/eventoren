import { describe, expect, test } from "bun:test"
import { mdiBankOutline } from "@adaptive-ds/mdi/mdiBankOutline.js"
import { mdiBankTransfer } from "@adaptive-ds/mdi/mdiBankTransfer.js"
import { mdiClockOutline } from "@adaptive-ds/mdi/mdiClockOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiQrcodeScan } from "@adaptive-ds/mdi/mdiQrcodeScan.js"
import { dashSeedCreate } from "../../../store/seed/dashSeedCreate.ts"
import { dashNotificationsCreate } from "./dashNotificationsCreate.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

describe("dashNotificationsCreate", () => {
  test("live Event zuerst, dann SEPA, dann Entwurf", () => {
    const state = dashSeedCreate(fixedNow)
    const result = dashNotificationsCreate(state, "org-lindenhof", fixedNow)
    expect(result.length).toBeGreaterThanOrEqual(3)
    expect(result[0]).toMatchObject({
      id: "live-ev-indie-night",
      icon: mdiQrcodeScan,
      tone: "brand",
      text: "Indie Night: Lichtspiel: Einlass läuft",
      href: "/demo/dashboard/events/ev-indie-night/einlass",
    })
    const sepaIndex = result.findIndex((item) => item.id === "sepa-offen")
    const draftIndex = result.findIndex((item) => item.id === "entwurf-ev-lesung")
    expect(sepaIndex).toBeGreaterThan(0)
    expect(draftIndex).toBeGreaterThan(sepaIndex)
    expect(result[sepaIndex]).toMatchObject({
      icon: mdiBankOutline,
      tone: "warning",
      text: "2 SEPA-Zahlungen offen",
      href: "/demo/dashboard/bestellungen?status=offen",
    })
    expect(result[draftIndex]).toMatchObject({
      icon: mdiPencilOutline,
      tone: "neutral",
      text: "Lesung: Stadt der Stimmen ist noch ein Entwurf",
      href: "/demo/dashboard/events/ev-lesung",
    })
    for (const item of result) expect(Date.parse(item.at)).not.toBeNaN()
  })

  test("zeigt nur Events der eigenen Org", () => {
    const state = dashSeedCreate(fixedNow)
    const result = dashNotificationsCreate(state, "org-lindenhof", fixedNow)
    expect(result.some((item) => item.id === "entwurf-ev-pilates-probe")).toBe(false)
  })

  test("aktive Phase mit Ende morgen wird erkannt und nach Datum sortiert", () => {
    const state = dashSeedCreate(fixedNow)
    const jazzA = state.ticketTypes.find((type) => type.id === "tt-jazz-a")
    const jazzB = state.ticketTypes.find((type) => type.id === "tt-jazz-b")
    if (!jazzA || !jazzB) throw new Error("Seed-Typen fehlen")
    const phaseA = jazzA.phases.find((phase) => phase.id === "ph-jazz-a-1")
    const phaseB = jazzB.phases.find((phase) => phase.id === "ph-jazz-b-1")
    if (!phaseA || !phaseB) throw new Error("Seed-Phasen fehlen")
    phaseA.endsAt = new Date(fixedNow.getTime() + 86_400_000).toISOString()
    phaseB.endsAt = new Date(fixedNow.getTime() + 2 * 86_400_000).toISOString()
    const result = dashNotificationsCreate(state, "org-lindenhof", fixedNow)
    const phases = result.filter((item) => item.id.startsWith("phase-"))
    expect(phases).toHaveLength(2)
    expect(phases[0]).toMatchObject({
      icon: mdiClockOutline,
      tone: "warning",
      text: "Phase 1 von Jazz & Wein endet morgen",
      href: "/demo/dashboard/events/ev-jazz-wein/tickets",
    })
    expect(phases[1]?.text).toBe("Phase 1 von Jazz & Wein endet in 2 Tagen")
    const liveIndex = result.findIndex((item) => item.id === "live-ev-indie-night")
    expect(result.findIndex((item) => item.id === phases[0]?.id)).toBeGreaterThan(liveIndex)
  })

  test("bereite Auszahlung steht am Ende", () => {
    const state = dashSeedCreate(fixedNow)
    const seedReadyLatest = state.payouts
      .filter((payout) => payout.orgId === "org-lindenhof" && payout.status === "bereit")
      .map((payout) => payout.dueAt)
      .sort()
      .at(-1)
    state.payouts.push({
      id: "payout-test",
      orgId: "org-lindenhof",
      eventId: "ev-poetry-slam",
      amountCents: 12345,
      status: "bereit",
      // nach allen Seed-Auszahlungen fällig, damit die neue Auszahlung die letzte bleibt
      dueAt: seedReadyLatest ?? new Date(fixedNow.getTime() - 2 * 86_400_000).toISOString(),
      paidAt: null,
      reference: "TEST-1",
    })
    const result = dashNotificationsCreate(state, "org-lindenhof", fixedNow)
    const payout = result.at(-1)
    expect(payout).toMatchObject({
      id: "payout-payout-test",
      icon: mdiBankTransfer,
      tone: "brand",
      text: "Auszahlung für Poetry Slam: Herbstworte bereit",
      href: "/demo/dashboard/finanzen",
    })
  })
})
