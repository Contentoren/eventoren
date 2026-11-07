import { expect, test } from "bun:test"
import { contentLinkCheck } from "../src/app/content/contentLinkCheck.ts"

const targets = {
  existing: new Set(["/ratgeber/tickets-online-verkaufen"]),
  planned: new Set(["/en/guides/sell-tickets-online"]),
}

test("allows the home page, contact page, both hubs and existing articles", () => {
  for (const href of ["/", "/kontakt", "/ratgeber", "/en/guides/", "/ratgeber/tickets-online-verkaufen#faq"])
    expect(contentLinkCheck(href, targets)).toBeUndefined()
  expect(contentLinkCheck("https://eventoren.de/kontakt", targets)).toBeUndefined()
})

test("allows external https links and warns about plain http", () => {
  expect(contentLinkCheck("https://www.gema.de/", targets)).toBeUndefined()
  expect(contentLinkCheck("http://example.org", targets)?.level).toBe("warning")
})

test("only warns for planned articles that do not exist yet", () => {
  expect(contentLinkCheck("/en/guides/sell-tickets-online", targets)?.level).toBe("warning")
})

test("rejects unknown internal paths and the forbidden organiser, demo and Abiball paths", () => {
  for (const href of [
    "/ratgeber/unbekannt",
    "/veranstalter",
    "/veranstalter-vertraege",
    "/demo/ratgeber",
    "/abiball-2027",
    "kontakt",
  ])
    expect(contentLinkCheck(href, targets)?.level).toBe("error")
  expect(contentLinkCheck("https://eventoren.de/veranstalter", targets)?.level).toBe("error")
})
