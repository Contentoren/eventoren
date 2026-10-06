import { describe, expect, it } from "@rstest/core"
import { eventorenE2eReturnUrlMatches } from "./eventorenE2eReturnUrlMatches.ts"

describe("Eventoren SSO callback navigation", () => {
  it("waits for the requested return route instead of stopping at the callback origin", () => {
    const baseOrigin = "https://eventoren.de"
    const returnTarget = new URL("/admin/bestellungen?state=active", baseOrigin)

    expect(
      eventorenE2eReturnUrlMatches(
        baseOrigin,
        returnTarget,
        new URL("/sign-in?returnTo=%2Fadmin%2Fbestellungen%3Fstate%3Dactive", baseOrigin),
      ),
    ).toBe(false)
    expect(eventorenE2eReturnUrlMatches(baseOrigin, returnTarget, returnTarget)).toBe(true)
    expect(
      eventorenE2eReturnUrlMatches(baseOrigin, returnTarget, new URL("https://idp.example/admin/bestellungen")),
    ).toBe(false)
  })
})
