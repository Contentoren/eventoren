import { describe, expect, test } from "bun:test"
import * as v from "valibot"
import { catalogEventFaqsSchema } from "./catalogEventFaqsSchema.ts"
import { catalogEventScheduleSchema } from "./catalogEventScheduleSchema.ts"
import { organizerDashboardEventCreateParse } from "#src/organizer/dashboard/events/model/organizerDashboardEventCreateParse.ts"
import { organizerDashboardEventPatchParse } from "#src/organizer/dashboard/events/model/organizerDashboardEventPatchParse.ts"

const faq = { id: "faq-1", question: "Wo?", answer: "Hier." }
const item = { id: "slot-1", time: "19:30", title: "Beginn", detail: "Bühne" }

describe("shared catalog FAQ and Berlin schedule validation", () => {
  test("bounded lists accept their limits and reject duplicate, malformed and oversized ids", () => {
    for (const [schema, row, max] of [
      [catalogEventFaqsSchema, faq, 20],
      [catalogEventScheduleSchema, item, 50],
    ] as const) {
      expect(
        v.safeParse(
          schema,
          Array.from({ length: max }, (_, i) => ({ ...row, id: `id-${i}` })),
        ).success,
      ).toBe(true)
      expect(
        v.safeParse(
          schema,
          Array.from({ length: max + 1 }, (_, i) => ({ ...row, id: `id-${i}` })),
        ).success,
      ).toBe(false)
      expect(v.safeParse(schema, [row, row]).success).toBe(false)
      for (const id of ["", "has space", "x".repeat(65)])
        expect(v.safeParse(schema, [{ ...row, id }]).success).toBe(false)
      expect(v.safeParse(schema, [{ ...row, id: "x".repeat(64) }]).success).toBe(true)
    }
  })

  test("FAQ question and answer have nonblank bounded content", () => {
    expect(
      v.safeParse(catalogEventFaqsSchema, [{ ...faq, question: "q".repeat(200), answer: "a".repeat(1000) }]).success,
    ).toBe(true)
    for (const row of [
      { ...faq, question: " " },
      { ...faq, answer: " " },
      { ...faq, question: "q".repeat(201) },
      { ...faq, answer: "a".repeat(1001) },
    ]) {
      expect(v.safeParse(catalogEventFaqsSchema, [row]).success).toBe(false)
    }
  })

  test("schedule accepts strict HH:mm wall times only, including DST-ambiguous times without instant conversion", () => {
    for (const time of ["00:00", "23:59", "02:30"])
      expect(v.safeParse(catalogEventScheduleSchema, [{ ...item, time }]).success).toBe(true)
    for (const time of ["24:00", "12:60", "9:00", "09:0", " 09:00", "09:00Z", "2027-03-28T02:30:00+01:00"]) {
      expect(v.safeParse(catalogEventScheduleSchema, [{ ...item, time }]).success).toBe(false)
    }
    expect(
      v.safeParse(catalogEventScheduleSchema, [{ ...item, title: "t".repeat(200), detail: "d".repeat(1000) }]).success,
    ).toBe(true)
    for (const row of [
      { ...item, title: " " },
      { ...item, title: "t".repeat(201) },
      { ...item, detail: "d".repeat(1001) },
    ]) {
      expect(v.safeParse(catalogEventScheduleSchema, [row]).success).toBe(false)
    }
  })

  test("create and patch parsers retain canonical rows; omission and explicit clearing are distinct", async () => {
    const draft = {
      title: "Fest",
      subtitle: "",
      description: "",
      category: "Musik",
      startsAt: "2027-06-01T20:00:00+02:00",
      endsAt: "2027-06-01T22:00:00+02:00",
      doorsAt: "2027-06-01T19:00:00+02:00",
      venue: "Saal",
      city: "Berlin",
      address: "",
      organizer: "",
      imageUrl: "",
      imageAlt: "",
      faqs: [faq],
      schedule: [item],
    }
    const created = await organizerDashboardEventCreateParse(draft)
    expect(created.success).toBe(true)
    if (created.success) {
      expect(created.data.schedule).toEqual([item])
      expect(created.data.faqs).toEqual([faq])
      expect(created.data.startsAt).toBe("2027-06-01T18:00:00.000Z")
    }
    expect(await organizerDashboardEventPatchParse({ faqs: [], schedule: [] })).toMatchObject({
      success: true,
      data: { faqs: [], schedule: [] },
    })
    expect(await organizerDashboardEventPatchParse({ title: "Neu" })).toMatchObject({
      success: true,
      data: { title: "Neu" },
    })
    expect(
      (await organizerDashboardEventCreateParse({ ...draft, schedule: [{ ...item, time: "24:00" }] })).success,
    ).toBe(false)
    expect((await organizerDashboardEventPatchParse({ faqs: [faq, faq] })).success).toBe(false)
  })
})
