import { describe, expect, test } from "bun:test"

import { dashSeedCreate } from "../../seed/dashSeedCreate.ts"
import { dashTemplateToWizard } from "./dashTemplateToWizard.ts"

const fixedNow = new Date("2026-10-18T10:00:00.000Z")

describe("dashTemplateToWizard", () => {
  test("übernimmt Vorlagenfelder und löst Offsets relativ zum Beginn auf", () => {
    const template = dashSeedCreate(fixedNow).templates[0]
    if (!template) throw new Error("Keine Vorlage im Seed.")
    const startsAt = "2026-12-05T19:30:00.000+01:00"
    const draft = dashTemplateToWizard(template, startsAt)
    expect(draft.title).toBe(template.event.title)
    expect(draft.venueName).toBe("Kulturhaus Lindenhof – Innenhof")
    expect(draft.startsAt).toBe(startsAt)
    // 180 Minuten Dauer → 22:30 Uhr
    expect(draft.endsAt).toBe("2026-12-05T21:30:00.000Z")
    // 60 Minuten vorher Einlass → 18:30 Uhr
    expect(draft.doorsAt).toBe("2026-12-05T17:30:00.000Z")
    expect(draft.tickets).toHaveLength(2)
    const standard = draft.tickets[0]
    expect(standard?.name).toBe("Standard")
    expect(standard?.phases).toHaveLength(2)
    // Early Bird: -20_160 Minuten ab Beginn (beachte +01:00-Offset)
    expect(standard?.phases[0]?.endsAt).toBe("2026-11-21T18:30:00.000Z")
    expect(standard?.phases[0]?.quota).toBe(100)
    expect(standard?.phases[1]?.endsAt).toBeNull()
    expect(draft.tickets[1]?.phasesExpanded).toBe(false)
  })
})
