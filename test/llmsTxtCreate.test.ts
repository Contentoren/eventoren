import { expect, test } from "bun:test"
import { llmsTxtCreate } from "../src/llms/llmsTxtCreate.ts"
import { contentListItemFixture } from "./contentViewStateHelpers.fixture.ts"

const siteUrl = "https://eventoren.de"

test("lists each published article as a markdown link with its description under its language section", () => {
  const text = llmsTxtCreate({
    siteUrl,
    ratgeber: [
      contentListItemFixture("ticketgebuehren", "tickets-verkaufen", {
        entry: { title: "Ticketgebühren 2026", description: "Was Ticketing kostet." },
      }),
    ],
    guides: [
      contentListItemFixture("fake-tickets", "for-ticket-buyers", {
        entry: { path: "/en/guides/fake-tickets", title: "Fake Tickets", description: "How to spot them." },
        meta: { collection: "guides", lang: "en" },
      }),
    ],
  })

  expect(text.startsWith("# Eventoren\n\n> ")).toBe(true)
  const ratgeberSection = text.slice(text.indexOf("## Ratgeber (Deutsch)"), text.indexOf("## Guides (English)"))
  const guidesSection = text.slice(text.indexOf("## Guides (English)"))
  expect(ratgeberSection).toContain(
    "- [Ticketgebühren 2026](https://eventoren.de/ratgeber/ticketgebuehren): Was Ticketing kostet.",
  )
  expect(guidesSection).toContain("- [Fake Tickets](https://eventoren.de/en/guides/fake-tickets): How to spot them.")
})

test("names the key pages and the fee", () => {
  const text = llmsTxtCreate({ siteUrl, ratgeber: [], guides: [] })

  for (const url of [
    "https://eventoren.de/",
    "https://eventoren.de/kontakt",
    "https://eventoren.de/ratgeber",
    "https://eventoren.de/en/guides",
  ])
    expect(text).toContain(`](${url})`)
  expect(text).toContain("3.9 % of the gross ticket price + EUR 0.49 per paid ticket")
})

test("escapes brackets in titles so the markdown link stays intact", () => {
  const text = llmsTxtCreate({
    siteUrl,
    ratgeber: [contentListItemFixture("x", "tickets-verkaufen", { entry: { title: "Codes [Presale]" } })],
    guides: [],
  })

  expect(text).toContain("- [Codes \\[Presale\\]](https://eventoren.de/ratgeber/x)")
})
