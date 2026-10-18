import { expect, test } from "bun:test"
import { dashEventPublicPath } from "./dashEventPublicPath.ts"

test("baut den öffentlichen Event-Pfad aus Org- und Event-Slug", () => {
  expect(dashEventPublicPath("kulturhaus-lindenhof", "jazz-und-wein")).toBe(
    "/demo/customer/veranstalter/kulturhaus-lindenhof/jazz-und-wein",
  )
})

test("übernimmt Slugs unverändert", () => {
  expect(dashEventPublicPath("abikur-ikg-2027", "abiball-2027")).toBe(
    "/demo/customer/veranstalter/abikur-ikg-2027/abiball-2027",
  )
})
