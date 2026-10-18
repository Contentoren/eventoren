import { describe, expect, test } from "bun:test"

import { dashOnboardingSlugUnique } from "./dashOnboardingSlugUnique.ts"

describe("dashOnboardingSlugUnique", () => {
  test("behält freie Slugs und hängt bei belegten einen Zähler an", () => {
    expect(dashOnboardingSlugUnique("Tanzschule Rhythmus", ["kulturhaus-lindenhof"])).toBe("tanzschule-rhythmus")
    expect(dashOnboardingSlugUnique("Tanz", ["tanz", "tanz-2"])).toBe("tanz-3")
    expect(dashOnboardingSlugUnique("  ", [])).toBe("veranstalter")
  })
})
