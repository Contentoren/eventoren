import { expect, test } from "bun:test"
import { abiballShopHtmlResponseCreate } from "../src/abiball/abiballShopHtmlResponseCreate.ts"

const shopHtml = '<!DOCTYPE html><html lang="de"><head></head><body>shop</body></html>'

test("abiballShopHtmlResponseCreate serves the shop inline as noindexed html with extensionless canonical", async () => {
  const response = abiballShopHtmlResponseCreate(shopHtml)

  expect(response.status).toBe(200)
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8")
  expect(response.headers.get("x-robots-tag")).toBe("noindex, nofollow")
  expect(response.headers.get("link")).toBe('<https://eventoren.de/abiball-2027>; rel="canonical"')
  expect(await response.text()).toBe(shopHtml)
})

test("abiballShopHtmlResponseCreate does not redirect to the .html asset or an event page", async () => {
  const response = abiballShopHtmlResponseCreate(shopHtml)

  expect(response.headers.get("location")).toBeNull()
  expect(response.headers.get("link")).not.toContain(".html")
  expect(response.headers.get("link")).not.toContain("/events/")
})
