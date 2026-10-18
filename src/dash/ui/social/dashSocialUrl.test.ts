import { expect, test } from "bun:test"
import { dashSocialUrl } from "./dashSocialUrl.ts"

test("Nutzername wird zur vollen URL mit Präfix", () => {
  expect(dashSocialUrl("instagram", "kulturhaus.lindenhof")).toBe("https://instagram.com/kulturhaus.lindenhof")
})

test("führendes @ wird entfernt, bei TikTok und YouTube wieder gesetzt", () => {
  expect(dashSocialUrl("tiktok", "@kulturhaus")).toBe("https://tiktok.com/@kulturhaus")
  expect(dashSocialUrl("youtube", "@kulturhaus")).toBe("https://youtube.com/@kulturhaus")
  expect(dashSocialUrl("instagram", "@kulturhaus")).toBe("https://instagram.com/kulturhaus")
})

test("volle URL mit passendem Host wird unverändert übernommen", () => {
  expect(dashSocialUrl("facebook", "https://facebook.com/kulturhaus")).toBe("https://facebook.com/kulturhaus")
  expect(dashSocialUrl("x", "http://x.com/kulturhaus")).toBe("https://x.com/kulturhaus")
  expect(dashSocialUrl("linkedin", "https://www.linkedin.com/company/lindenhof")).toBe(
    "https://www.linkedin.com/company/lindenhof",
  )
})

test("fremde URL wird als Nutzername auf dem eigenen Host interpretiert", () => {
  expect(dashSocialUrl("instagram", "https://example.com/kulturhaus")).toBe(
    "https://instagram.com/example.com/kulturhaus",
  )
})

test("leerer Wert ergibt null", () => {
  expect(dashSocialUrl("instagram", "")).toBeNull()
  expect(dashSocialUrl("instagram", "   ")).toBeNull()
  expect(dashSocialUrl("instagram", "@")).toBeNull()
})
