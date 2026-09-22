import { describe, expect, test } from "bun:test"
import { createResult, createResultError } from "#result"
import { adminRouteLoaderResolve } from "../src/admin/adminRouteLoaderResolve.ts"
import { adminRouteText } from "../src/admin/adminRouteText.ts"
import type { UserProfile } from "../src/auth/model/UserProfile.ts"

describe("admin route authorization", () => {
  const sampleUserProfile = (role: UserProfile["role"]): UserProfile => ({
    userId: "test-user-1",
    name: "Test User",
    email: "test@example.test",
    role,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
  })

  test("returns unauthorized state without redirecting or fetching catalog events when admin role is required", async () => {
    let catalogFetched = false
    let redirectCalled = false

    const result = await adminRouteLoaderResolve({
      getAdminAccess: async () => createResultError("eventorenAdminAccessRead", "Eventoren-Adminrolle erforderlich"),
      getCatalogEvents: async () => {
        catalogFetched = true
        return { success: true as const, data: [] }
      },
      redirect: () => {
        redirectCalled = true
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({ authorized: false })
    expect(catalogFetched).toBe(false)
    expect(redirectCalled).toBe(false)
  })

  test("redirects unauthenticated users to /sign-in with returnTo=/admin without fetching catalog events", async () => {
    let catalogFetched = false
    let redirectTarget: { to: string; search?: Record<string, string> } | undefined

    try {
      await adminRouteLoaderResolve({
        getAdminAccess: async () => createResultError("eventorenAdminAccessRead", "Anmeldung erforderlich"),
        getCatalogEvents: async () => {
          catalogFetched = true
          return { success: true as const, data: [] }
        },
        redirect: (opts) => {
          redirectTarget = opts
          throw new Error("REDIRECT_TRIGGERED")
        },
      })
      expect().fail("expected redirect to be thrown")
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT_TRIGGERED")
    }

    expect(redirectTarget).toEqual({
      to: "/sign-in",
      search: { returnTo: "/admin" },
    })
    expect(catalogFetched).toBe(false)
  })

  test("redirects any other failed access check to /sign-in with returnTo=/admin", async () => {
    let catalogFetched = false
    let redirectTarget: { to: string; search?: Record<string, string> } | undefined

    try {
      await adminRouteLoaderResolve({
        getAdminAccess: async () => createResultError("eventorenAdminAccessRead", "Sitzung ungültig"),
        getCatalogEvents: async () => {
          catalogFetched = true
          return { success: true as const, data: [] }
        },
        redirect: (opts) => {
          redirectTarget = opts
          throw new Error("REDIRECT_TRIGGERED")
        },
      })
      expect().fail("expected redirect to be thrown")
    } catch (error) {
      expect((error as Error).message).toBe("REDIRECT_TRIGGERED")
    }

    expect(redirectTarget).toEqual({
      to: "/sign-in",
      search: { returnTo: "/admin" },
    })
    expect(catalogFetched).toBe(false)
  })

  test("fetches catalog events and returns authorized payload for admin role", async () => {
    let catalogFetched = false
    const mockEvents = { success: true as const, data: [] }

    const result = await adminRouteLoaderResolve({
      getAdminAccess: async () => createResult(sampleUserProfile("admin")),
      getCatalogEvents: async () => {
        catalogFetched = true
        return mockEvents
      },
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      eventsResult: mockEvents,
      isServerAuthorized: true,
    })
    expect(catalogFetched).toBe(true)
  })

  test("fetches catalog events and returns authorized payload for dev role", async () => {
    let catalogFetched = false
    const mockEvents = { success: true as const, data: [] }

    const result = await adminRouteLoaderResolve({
      getAdminAccess: async () => createResult(sampleUserProfile("dev")),
      getCatalogEvents: async () => {
        catalogFetched = true
        return mockEvents
      },
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      eventsResult: mockEvents,
      isServerAuthorized: true,
    })
    expect(catalogFetched).toBe(true)
  })

  test("keeps an authorized catalog load failure in the loader payload", async () => {
    const catalogFailure = {
      success: false as const,
      errorMessage: "Admin-Veranstaltungen konnten nicht geladen werden.",
    }

    const result = await adminRouteLoaderResolve({
      getAdminAccess: async () => createResult(sampleUserProfile("admin")),
      getCatalogEvents: async () => catalogFailure,
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      eventsResult: catalogFailure,
      isServerAuthorized: true,
    })
  })

  test("provides explicit German access-denied copy with admin role requirement", () => {
    const text = adminRouteText()

    expect(text.accessDeniedTitle).toBe("Admin-Zugriff verweigert")
    expect(text.accessDeniedSubtitle).toBe("Für diesen Bereich ist eine Eventoren-Adminrolle erforderlich.")
    expect(text.backToHome).toBe("Zurück zur Startseite")
  })
})
