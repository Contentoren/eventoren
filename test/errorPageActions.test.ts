import { describe, expect, test } from "bun:test"
import { errorPageActionsStateCreate } from "../src/components/errorPageActionsStateCreate.ts"
import { errorPageBackNavigate } from "../src/components/errorPageBackNavigate.ts"
import { errorPageRefreshExecute } from "../src/components/errorPageRefreshExecute.ts"

describe("errorPageBackNavigate", () => {
  test("navigates back using history when prior history entries exist", () => {
    let backCalled = false
    let assignedUrl: string | undefined

    errorPageBackNavigate({
      history: {
        length: 3,
        back: () => {
          backCalled = true
        },
      },
      location: {
        assign: (url: string) => {
          assignedUrl = url
        },
      },
    })

    expect(backCalled).toBe(true)
    expect(assignedUrl).toBeUndefined()
  })

  test("falls back to home when history has no prior entries", () => {
    let backCalled = false
    let assignedUrl: string | undefined

    errorPageBackNavigate({
      history: {
        length: 1,
        back: () => {
          backCalled = true
        },
      },
      location: {
        assign: (url: string) => {
          assignedUrl = url
        },
      },
    })

    expect(backCalled).toBe(false)
    expect(assignedUrl).toBe("/")
  })

  test("falls back to custom href when provided and history length <= 1", () => {
    let backCalled = false
    let assignedUrl: string | undefined

    errorPageBackNavigate({
      fallbackHref: "/admin",
      history: {
        length: 1,
        back: () => {
          backCalled = true
        },
      },
      location: {
        assign: (url: string) => {
          assignedUrl = url
        },
      },
    })

    expect(backCalled).toBe(false)
    expect(assignedUrl).toBe("/admin")
  })

  test("does not throw when history or location are undefined", () => {
    expect(() => {
      errorPageBackNavigate({
        history: undefined,
        location: undefined,
      })
    }).not.toThrow()
  })
})

describe("errorPageRefreshExecute", () => {
  test("invokes location reload", () => {
    let reloaded = false

    errorPageRefreshExecute({
      location: {
        reload: () => {
          reloaded = true
        },
      },
    })

    expect(reloaded).toBe(true)
  })

  test("does not throw when location is undefined", () => {
    expect(() => {
      errorPageRefreshExecute({ location: undefined })
    }).not.toThrow()
  })
})

describe("errorPageActionsStateCreate", () => {
  test("returns explicit showSignOut state when provided", () => {
    const stateTrue = errorPageActionsStateCreate({
      showSignOut: () => true,
      authControlState: {
        isAuthenticated: () => false,
        logout: async () => {},
      },
    })
    expect(stateTrue.isSignOutVisible()).toBe(true)

    const stateFalse = errorPageActionsStateCreate({
      showSignOut: () => false,
      authControlState: {
        isAuthenticated: () => true,
        logout: async () => {},
      },
    })
    expect(stateFalse.isSignOutVisible()).toBe(false)
  })

  test("falls back to auth state when showSignOut is not provided", () => {
    let authenticated = false
    const state = errorPageActionsStateCreate({
      authControlState: {
        isAuthenticated: () => authenticated,
        logout: async () => {},
      },
    })

    expect(state.isSignOutVisible()).toBe(false)
    authenticated = true
    expect(state.isSignOutVisible()).toBe(true)
  })

  test("delegates onBack with fallbackHref", () => {
    let navigatedWithHref: string | undefined
    const state = errorPageActionsStateCreate({
      fallbackHref: () => "/custom-fallback",
      backNavigate: (options) => {
        navigatedWithHref = options?.fallbackHref
      },
    })

    state.onBack()
    expect(navigatedWithHref).toBe("/custom-fallback")
  })

  test("delegates onRefresh", () => {
    let refreshTriggered = false
    const state = errorPageActionsStateCreate({
      refreshExecute: () => {
        refreshTriggered = true
      },
    })

    state.onRefresh()
    expect(refreshTriggered).toBe(true)
  })

  test("delegates onSignOut and prevents default event", async () => {
    let defaultPrevented = false
    let logoutCalled = false

    const state = errorPageActionsStateCreate({
      authControlState: {
        isAuthenticated: () => true,
        logout: async () => {
          logoutCalled = true
        },
      },
    })

    const fakeEvent = {
      preventDefault: () => {
        defaultPrevented = true
      },
    } as unknown as SubmitEvent

    await state.onSignOut(fakeEvent)

    expect(defaultPrevented).toBe(true)
    expect(logoutCalled).toBe(true)
  })
})
