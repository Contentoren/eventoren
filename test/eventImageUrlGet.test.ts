import { expect, test } from "bun:test"
import { eventImagePlaceholder } from "../src/events/eventImagePlaceholder.ts"
import { eventImageUrlGet } from "../src/events/eventImageUrlGet.ts"

test("eventImageUrlGet uses the existing placeholder for blank URLs", () => {
  expect(eventImageUrlGet("  ")).toBe(eventImagePlaceholder)
  expect(eventImageUrlGet("https://example.com/event.webp")).toBe("https://example.com/event.webp")
})
