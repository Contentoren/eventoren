import { describe, expect, it, mock } from "bun:test"

interface TicketAdminScenario {
  url: string
  navVisible: boolean
  headingText: string
  contentHeadingVisible: boolean
  newEventLinkVisible: boolean
}

function ticketAdminScenarioCreate(overrides: Partial<TicketAdminScenario> = {}): TicketAdminScenario {
  return {
    url: "https://eventoren.leonardomora.de/admin/events",
    navVisible: true,
    headingText: "Events",
    contentHeadingVisible: true,
    newEventLinkVisible: true,
    ...overrides,
  }
}

let scenario = ticketAdminScenarioCreate()
const recorded: Array<{ key: string; matcher: string }> = []
const signInCalls: Array<{ baseUrl: string; path: string }> = []

function ticketAdminLocatorVisible(key: string): boolean {
  if (key.startsWith("navigation:")) return scenario.navVisible
  if (key === "heading:/events/i") return scenario.contentHeadingVisible
  if (key === "link:/event erstellen|neues event/i") return scenario.newEventLinkVisible
  // The real admin UI keeps Abmelden inside the closed account popover.
  return false
}

const ticketAdminPageMock = {
  __page: true,
  url: () => scenario.url,
  waitForURL: async (predicate: (url: URL) => boolean) => {
    if (!predicate(new URL(scenario.url))) throw new Error(`waitForURL timeout: unexpected URL ${scenario.url}`)
  },
  getByRole: (role: string, options?: { name?: string | RegExp }) => {
    const name = String(options?.name)
    if (role === "navigation") {
      return {
        __key: `navigation:${name}`,
        getByRole: (innerRole: string, innerOptions?: { name?: string | RegExp }) => ({
          __key: `navigation:${name} ${innerRole}:${String(innerOptions?.name)}`,
          click: async () => {
            scenario.url = "https://eventoren.leonardomora.de/admin/events"
          },
        }),
      }
    }
    return { __key: `${role}:${name}`, click: async () => {} }
  },
  locator: (selector: string) => ({ __key: `locator:${selector}` }),
}

function ticketAdminPlaywrightExpect(target: unknown) {
  const key = (target as { __key?: string } | undefined)?.__key
  if ((target as { __page?: boolean } | undefined)?.__page) {
    return {
      toHaveURL: async (pattern: RegExp) => {
        recorded.push({ key: "page-url", matcher: "toHaveURL" })
        if (!pattern.test(scenario.url)) throw new Error(`expected URL ${scenario.url} to match ${pattern}`)
      },
    }
  }
  return {
    toBeVisible: async () => {
      recorded.push({ key: key ?? "unknown", matcher: "toBeVisible" })
      if (!ticketAdminLocatorVisible(key ?? "unknown")) throw new Error(`expected locator ${key} to be visible`)
    },
    toHaveText: async (text: string) => {
      recorded.push({ key: key ?? "unknown", matcher: "toHaveText" })
      if (key !== "locator:main#content h1" || scenario.headingText !== text) {
        throw new Error(`expected locator ${key} to have text ${text}`)
      }
    },
  }
}

mock.module("@rstest/playwright", () => ({ expect: ticketAdminPlaywrightExpect }))
mock.module("./eventorenE2eSignIn.ts", () => ({
  eventorenE2eSignIn: async (_page: unknown, baseUrl: string, path: string) => {
    signInCalls.push({ baseUrl, path })
  },
}))

const { ticketE2eAdminSignIn } = await import("./ticketE2eAdminSignIn.ts")

describe("ticket admin sign-in stays green with a closed account menu", () => {
  it("succeeds for the authenticated admin workspace without requiring the hidden Abmelden button", async () => {
    scenario = ticketAdminScenarioCreate()
    recorded.length = 0
    signInCalls.length = 0

    await ticketE2eAdminSignIn(ticketAdminPageMock as never, "https://eventoren.leonardomora.de")

    expect(signInCalls).toEqual([{ baseUrl: "https://eventoren.leonardomora.de", path: "/admin/events" }])
    expect(
      recorded.some(
        ({ key, matcher }) => key === "navigation:Admin-Navigation link:Events" && matcher === "toBeVisible",
      ),
    ).toBe(true)
    expect(recorded.some(({ key, matcher }) => key === "locator:main#content h1" && matcher === "toHaveText")).toBe(
      true,
    )
    expect(recorded.some(({ key }) => key.includes("Abmelden"))).toBe(false)
  })

  it("does not accept anonymous visitors stuck on the sign-in page", async () => {
    scenario = ticketAdminScenarioCreate({
      url: "https://eventoren.leonardomora.de/sign-in?returnTo=%2Fadmin%2Fevents",
      navVisible: false,
    })
    recorded.length = 0

    await expect(
      ticketE2eAdminSignIn(ticketAdminPageMock as never, "https://eventoren.leonardomora.de"),
    ).rejects.toThrow("waitForURL timeout")
  })

  it("does not accept the access-denied error page without admin navigation", async () => {
    scenario = ticketAdminScenarioCreate({ navVisible: false, headingText: "Zugriff verweigert" })
    recorded.length = 0

    await expect(
      ticketE2eAdminSignIn(ticketAdminPageMock as never, "https://eventoren.leonardomora.de"),
    ).rejects.toThrow("to be visible")
  })
})
