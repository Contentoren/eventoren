import { expect, test } from "bun:test"
import { convexFunctionCatalog, convexFunctionCatalogTotals } from "./convexFunctionCatalog.js"
import {
  convexFunctionCatalogCollect,
  convexFunctionCatalogRender,
} from "../../../scripts/convexFunctionCatalogGenerate.js"
import { readFileSync } from "node:fs"
import { join } from "node:path"

test("convexFunctionCatalog is in sync with the generator", () => {
  const rendered = convexFunctionCatalogRender(convexFunctionCatalogCollect(process.cwd()))
  const checkedIn = readFileSync(join(process.cwd(), "src/utils/convex_client/convexFunctionCatalog.ts"), "utf8")
  expect(rendered).toBe(checkedIn)
})

test("convexFunctionCatalog covers every convex module with totals", () => {
  expect(convexFunctionCatalogTotals.functions).toBeGreaterThan(200)
  expect(convexFunctionCatalogTotals.public + convexFunctionCatalogTotals.internal).toBe(
    convexFunctionCatalogTotals.functions,
  )
  expect(
    convexFunctionCatalogTotals.query + convexFunctionCatalogTotals.mutation + convexFunctionCatalogTotals.action,
  ).toBe(convexFunctionCatalogTotals.public)
  for (const module of [
    "auth",
    "catalog",
    "customerAccount",
    "organizer",
    "organizerDashboard",
    "organizerDashboardEvents",
    "scannerLinks",
    "ticketing",
  ]) {
    expect(Object.keys(convexFunctionCatalog[module] ?? {}).length).toBeGreaterThan(0)
  }
})

test("convexFunctionCatalog spot-checks known functions", () => {
  expect(convexFunctionCatalog["catalog"]?.["catalogEventListPublishedPageQuery"]).toEqual({
    kind: "query",
    visibility: "public",
    acceptsToken: false,
  })
  expect(convexFunctionCatalog["publicProjectInfo"]?.["publicProjectInfo"]?.kind).toBe("query")
  expect(convexFunctionCatalog["auth"]?.["apiKeyCreateMutation"]?.acceptsToken).toBe(true)
  expect(convexFunctionCatalog["auth"]?.["apiKeyExpireInternalMutation"]?.visibility).toBe("internal")
})
