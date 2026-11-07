import { expect, mock, test } from "bun:test"
import { createRoot } from "solid-js"

const catalog: Record<string, unknown> = {}
mock.module("../assets/imageList.js", () => ({ imageList: catalog }))

const { contentHubHeroImageRead, contentHubPageStateCreate } = await import("./contentHubPageStateCreate.ts")

function hubHeroCatalogEntry() {
  return {
    basename: "ratgeber-hub-hero",
    path: "images/ratgeber-hub-hero_default_v1.avif",
    metadata: { width: 1920, height: 1080, alt: "Katalog-Alt (wird nie angezeigt)" },
  }
}

test("hub hero image is undefined until the key resolves in the catalog", () => {
  for (const key of Object.keys(catalog)) delete catalog[key]
  expect(contentHubHeroImageRead("de")).toBeUndefined()
  expect(contentHubHeroImageRead("en")).toBeUndefined()
})

test("hub hero image resolves with the hub copy alt in the hub language", () => {
  catalog["ratgeber-hub-hero"] = hubHeroCatalogEntry()
  const de = contentHubHeroImageRead("de")
  const en = contentHubHeroImageRead("en")
  expect(de?.src).toContain("ratgeber-hub-hero")
  expect(de?.alt).toBe(
    "Jubelnde Festivalmenge bei Sonnenuntergang aus erhöhter Perspektive, türkisfarbenes Bühnenlicht und warme Lichterketten über tanzenden Gästen",
  )
  expect(en?.alt).toBe(
    "Cheering festival crowd at sunset seen from above, teal stage light and warm string lights over dancing guests",
  )
  expect(de).toMatchObject({ width: 1920, height: 1080 })
})

test("hub state exposes hero image, hub breadcrumbs and empty sections", () => {
  for (const key of Object.keys(catalog)) delete catalog[key]
  const state = createRoot(() => contentHubPageStateCreate({ collection: () => "ratgeber", items: () => [] }))
  expect(state.heroImage()).toBeUndefined()
  expect(state.isEmpty()).toBe(true)
  expect(state.breadcrumbs()).toEqual([
    { label: "Startseite", href: "/" },
    { label: "Ratgeber", href: null },
  ])
  expect(state.h1()).toContain("Ratgeber")
})
