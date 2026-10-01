import { expect, test } from "bun:test"
import { catalogPilatesImageBackfillCreate } from "../src/catalog/convex/catalogPilatesImageBackfillCreate.ts"

const blank = { eventKey: "pilates-christmas-event-2027-final", imageUrl: " \t", imageAlt: "" }
const baseUrl = "https://assets-service-public.contentoren.de/eventoren/public/images/pilates/"

test("the Pilates repair uses published managed detail and thumbnail URLs and managed alt text", () => {
  expect(catalogPilatesImageBackfillCreate(blank)).toEqual({
    imageUrl: `${baseUrl}detail_default_v1.avif`,
    imageVariants: {
      assetId: "asset-upload-edf48a71-81be-4699-9ed1-1db32db0a3da",
      detail: `${baseUrl}detail_default_v1.avif`,
      card: `${baseUrl}card_default_v1.avif`,
      organizer: `${baseUrl}card_default_v1.avif`,
    },
    imageAlt: "Pilates Christmas Event von Jennifer Kalus Hair Boutique und Flora Bonn mit Weihnachtsbaum",
  })
})

test("the Pilates repair retains nonblank administrator alt text", () => {
  expect(catalogPilatesImageBackfillCreate({ ...blank, imageAlt: "  Saved description  " })?.imageAlt).toBe(
    "  Saved description  ",
  )
})

test("the Pilates repair never changes an existing configured image or any configured variant", () => {
  expect(catalogPilatesImageBackfillCreate({ ...blank, imageUrl: " https://example.com/custom.webp " })).toBeUndefined()
  for (const key of ["detail", "card", "organizer"] as const) {
    expect(
      catalogPilatesImageBackfillCreate({
        ...blank,
        imageVariants: {
          assetId: "saved",
          detail: "",
          card: "",
          organizer: "",
          [key]: "https://example.com/saved.webp",
        },
      }),
    ).toBeUndefined()
  }
})

test("the Pilates repair cannot affect unrelated or deleted events", () => {
  expect(catalogPilatesImageBackfillCreate({ ...blank, eventKey: "another-event" })).toBeUndefined()
  expect(catalogPilatesImageBackfillCreate({ ...blank, deletedAt: "2026-09-30T12:00:00Z" })).toBeUndefined()
})
