import { describe, expect, it } from "bun:test"
import * as v from "valibot"

import { dashStateSchema } from "../../model/dashStateSchema.ts"

import { dashSeedCreate } from "./dashSeedCreate.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")
const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

describe("dashSeedCreate", () => {
  it("erzeugt einen gueltigen DashState", () => {
    const parsed = v.safeParse(dashStateSchema, dashSeedCreate(fixedNow))
    if (!parsed.success) console.log(JSON.stringify(parsed.issues, null, 2))
    expect(parsed.success).toBe(true)
  })

  it("ist deterministisch fuer dasselbe Datum", () => {
    const first = dashSeedCreate(fixedNow)
    const second = dashSeedCreate(fixedNow)
    expect(JSON.stringify(second)).toBe(JSON.stringify(first))
  })

  it("enthaelt alle festen IDs", () => {
    const state = dashSeedCreate(fixedNow)
    const orgIds = state.orgs.map((org) => org.id)
    expect(orgIds).toEqual(["org-lindenhof", "org-abikur", "org-studio-balance", "org-nachtwerk"])
    const eventIds = state.events.map((event) => event.id)
    expect(eventIds).toEqual([
      "ev-sommernacht",
      "ev-indie-night",
      "ev-jazz-wein",
      "ev-winterball",
      "ev-lesung",
      "ev-abiball-2027",
      "ev-pilates-probe",
      "ev-poetry-slam",
      "ev-abi-warmup",
    ])
    expect(state.session).toEqual({ userId: "user-mara", activeOrgId: "org-lindenhof", simulatedRole: null })
    expect(state.users.map((user) => user.id)).toContain("user-mara")
    expect(state.members.map((member) => member.id)).toContain("mem-tim-lindenhof")
    expect(state.codes.map((code) => code.code)).toContain("JAZZ10")
    expect(state.codes.map((code) => code.code)).toContain("ABI-12A")
    expect(state.codes.map((code) => code.code)).toContain("LEHRER-IKG")
    expect(state.vouchers.map((voucher) => voucher.id)).toContain("vou-foerder-100")
    expect(state.guestQuotas.map((quota) => quota.id)).toContain("gq-winter-presse")
    expect(state.scannerLinks.map((link) => link.id)).toContain("scanlink-nord")
    expect(state.messages.map((message) => message.id)).toContain("msg-indie-erinnerung")
    expect(state.templates.map((template) => template.id)).toContain("tpl-konzert-im-hof")
  })

  it("hat ev-indie-night live zum Seed-Zeitpunkt", () => {
    const state = dashSeedCreate(fixedNow)
    const indie = state.events.find((event) => event.id === "ev-indie-night")
    expect(indie).toBeDefined()
    const at = fixedNow.getTime()
    expect(Date.parse(indie?.doorsAt ?? "")).toBeLessThanOrEqual(at)
    expect(Date.parse(indie?.startsAt ?? "")).toBeGreaterThan(at)
    expect(Date.parse(indie?.endsAt ?? "")).toBeGreaterThan(at)
  })

  it("nutzt gueltige Slugs fuer Orgs und Events", () => {
    const state = dashSeedCreate(fixedNow)
    for (const org of state.orgs) expect(slugPattern.test(org.slug)).toBe(true)
    for (const event of state.events) expect(slugPattern.test(event.slug)).toBe(true)
  })

  it("gibt jeder Ticketart mindestens eine Phase", () => {
    const state = dashSeedCreate(fixedNow)
    expect(state.ticketTypes.length).toBeGreaterThan(0)
    for (const ticketType of state.ticketTypes) expect(ticketType.phases.length).toBeGreaterThan(0)
  })
})
