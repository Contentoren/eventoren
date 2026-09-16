import { expect, test } from "bun:test"

test("Tailwind dark utilities are explicit-class gated for the light-only app", async () => {
  const tailwindCss = await Bun.file(new URL("../src/tailwind.css", import.meta.url)).text()

  expect(tailwindCss).toContain("@custom-variant dark (&:where(.dark, .dark *));")
  expect(tailwindCss).not.toContain("@media (prefers-color-scheme: dark)")
})
