import { expect, test } from "bun:test"
import { dashEventPublicUrl } from "./dashEventPublicUrl.ts"

test("baut die öffentliche Event-URL aus Org- und Event-Slug", () => {
  expect(dashEventPublicUrl("kulturhaus-lindenhof", "jazz-und-wein")).toBe(
    "https://eventoren.de/veranstalter/kulturhaus-lindenhof/jazz-und-wein",
  )
})

test("übernimmt Slugs unverändert", () => {
  expect(dashEventPublicUrl("abikur-ikg-2027", "abiball-2027")).toBe(
    "https://eventoren.de/veranstalter/abikur-ikg-2027/abiball-2027",
  )
})
