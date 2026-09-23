import { expect, test } from "bun:test"
import { speculationRules } from "../src/routes/speculationRules.ts"

test("document speculation prerenders public pages but excludes admin routes", () => {
  expect(JSON.parse(speculationRules)).toEqual({
    prerender: [
      {
        where: {
          and: [
            { href_matches: "/*" },
            {
              not: {
                or: [{ href_matches: "/admin" }, { href_matches: "/admin/*" }],
              },
            },
          ],
        },
        eagerness: "moderate",
      },
    ],
  })
})
