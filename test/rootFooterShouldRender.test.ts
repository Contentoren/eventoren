import { expect, test } from "bun:test"
import { rootFooterShouldRender } from "../src/marketing/rootFooterShouldRender.js"

test("root footer is omitted for SiteFrame routes", () => {
  expect(rootFooterShouldRender([{ routeId: "/", status: "success" }])).toBe(false)
  expect(rootFooterShouldRender([{ routeId: "/events/$eventId", status: "success" }])).toBe(false)
})

test("root footer remains for root-only routes", () => {
  expect(rootFooterShouldRender([{ routeId: "/impressum", status: "success" }])).toBe(true)
})

test("root footer is omitted for the SiteFrame not-found page", () => {
  expect(rootFooterShouldRender([{ routeId: "__root__", status: "notFound" }])).toBe(false)
})
