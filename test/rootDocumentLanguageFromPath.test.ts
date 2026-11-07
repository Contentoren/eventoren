import { expect, test } from "bun:test"
import { rootDocumentLanguageFromPath } from "../src/app/i18n/rootDocumentLanguageFromPath.ts"

test.each(["/en", "/en/", "/en/guides", "/en/guides/sell-tickets-online"])("%s is an English document", (path) => {
  expect(rootDocumentLanguageFromPath(path)).toBe("en")
})

test.each(["/", "/ratgeber", "/ratgeber/tickets-online-verkaufen", "/events/x", "/english", "/enx/guides"])(
  "%s stays a German document",
  (path) => {
    expect(rootDocumentLanguageFromPath(path)).toBe("de")
  },
)
