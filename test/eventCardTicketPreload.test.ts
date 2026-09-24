import { expect, test } from "bun:test"

test("event cards leave hover prerendering to document speculation instead of also preloading route data", async () => {
  const source = await Bun.file(new URL("../src/events/EventCardTicket.tsx", import.meta.url)).text()

  expect(source).toMatch(/<Link\s+to=\{props\.href\}\s+preload=\{false\}/)
  expect(source).toMatch(
    /<Link\s+to="\/events\/\$eventId"\s+params=\{\{ eventId: props\.event\.id \}\}\s+preload=\{false\}/,
  )
})
