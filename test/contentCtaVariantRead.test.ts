import { expect, test } from "bun:test"
import { contentCtaConfig } from "../src/app/content/contentCtaConfig.ts"
import { contentCtaVariantRead } from "../src/app/content/contentCtaVariantRead.ts"

test("buyer categories get the buyer CTA, all other categories the organiser CTA", () => {
  expect(contentCtaVariantRead("ratgeber", "ticketkaeufer")).toBe("buyer")
  expect(contentCtaVariantRead("guides", "for-ticket-buyers")).toBe("buyer")
  expect(contentCtaVariantRead("ratgeber", "tickets-verkaufen")).toBe("organiser")
  expect(contentCtaVariantRead("guides", "selling-tickets")).toBe("organiser")
  // Category ids are per collection: the German buyer id is not a buyer category for the guides.
  expect(contentCtaVariantRead("guides", "ticketkaeufer")).toBe("organiser")
})

test("organiser CTAs link to /kontakt and /, buyer CTAs only to the event listing", () => {
  for (const lang of ["de", "en"] as const) {
    expect(contentCtaConfig[lang].organiser.actions.map((action) => action.href)).toEqual(["/kontakt", "/"])
    expect(contentCtaConfig[lang].buyer.actions.map((action) => action.href)).toEqual(["/"])
  }
  expect(contentCtaConfig.de.organiser.heading).toBe("Tickets für dein Event online verkaufen")
  expect(contentCtaConfig.de.organiser.text).toContain("3,9 % + 0,49 €")
})
