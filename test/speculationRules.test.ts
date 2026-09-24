import { expect, test } from "bun:test"
import { speculationRules } from "../src/routes/speculationRules.ts"

test("document speculation keeps public pages while excluding session-dependent routes", () => {
  expect(JSON.parse(speculationRules)).toEqual({
    prerender: [
      {
        where: {
          and: [
            { href_matches: "/*" },
            {
              not: {
                or: [
                  { href_matches: "/admin" },
                  { href_matches: "/admin/*" },
                  { href_matches: "/organizer" },
                  { href_matches: "/organizer/*" },
                  { href_matches: "/bestellungen" },
                  { href_matches: "/checkout" },
                  { href_matches: "/warenkorb" },
                  { href_matches: "/sign-in" },
                  { href_matches: "/sso" },
                  { href_matches: "/logout" },
                ],
              },
            },
          ],
        },
        eagerness: "moderate",
      },
    ],
  })
})
