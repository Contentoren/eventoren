import { expect, test } from "bun:test"
import { eventImageErrorHandle } from "../src/events/eventImageErrorHandle.ts"
import { eventImagePlaceholder } from "../src/events/eventImagePlaceholder.ts"

function imageFakeCreate(initialSrc: string) {
  let rawSrc = initialSrc
  let assignments = 0
  return {
    image: {
      getAttribute: (name: string) => (name === "src" ? rawSrc : null),
      get src() {
        return new URL(rawSrc, "https://example.com").href
      },
      set src(value: string) {
        rawSrc = value
        assignments += 1
      },
    },
    assignments: () => assignments,
  }
}

test("eventImageErrorHandle replaces a failing image URL with the existing placeholder", () => {
  const fake = imageFakeCreate("https://example.com/missing.webp")
  eventImageErrorHandle({ currentTarget: fake.image })
  expect(fake.image.getAttribute("src")).toBe(eventImagePlaceholder)
  expect(fake.assignments()).toBe(1)
})

test("eventImageErrorHandle does not reassign the placeholder when it also fails", () => {
  const fake = imageFakeCreate("https://example.com/missing.webp")
  eventImageErrorHandle({ currentTarget: fake.image })
  expect(fake.image.src).toBe(`https://example.com${eventImagePlaceholder}`)
  eventImageErrorHandle({ currentTarget: fake.image })
  eventImageErrorHandle({ currentTarget: fake.image })
  expect(fake.image.getAttribute("src")).toBe(eventImagePlaceholder)
  expect(fake.assignments()).toBe(1)
})
