import { describe, expect, test } from "bun:test"
import { createResult, createResultError } from "#result"
import type { UserProfile } from "../src/auth/model/UserProfile.ts"
import { organizerRouteLoaderResolve } from "../src/organizer/organizerRouteLoaderResolve.ts"
import { organizerRouteText } from "../src/organizer/organizerRouteText.ts"

describe("organizer route authorization", () => {
  const sampleUserProfile = (role: UserProfile["role"]): UserProfile => ({
    userId: "test-user-1",
    name: "Test User",
    email: "test@example.test",
    role,
    createdAt: "2026-09-01T12:00:00.000Z",
    updatedAt: "2026-09-01T12:00:00.000Z",
  })

  test("returns unauthorized state without redirecting when organizer role is required", async () => {
    let redirectCalled = false

    const result = await organizerRouteLoaderResolve({
      getOrganizerAccess: async () =>
        createResultError("eventorenOrganizerAccessRead", "Eventoren-Veranstalterrolle erforderlich"),
      returnTo: "/organizer",
      redirect: () => {
        redirectCalled = true
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({ authorized: false })
    expect(redirectCalled).toBe(false)
  })

  test("redirects unauthenticated users to /sign-in with returnTo target", async () => {
    let redirectTarget: { to: string; search?: Record<string, string> } | undefined

    try {
      await organizerRouteLoaderResolve({
        getOrganizerAccess: async () => createResultError("eventorenOrganizerAccessRead", "Anmeldung erforderlich"),
        returnTo: "/organizer",
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
      search: { returnTo: "/organizer" },
    })
  })

  test("redirects any other failed access check to /sign-in with returnTo target", async () => {
    let redirectTarget: { to: string; search?: Record<string, string> } | undefined

    try {
      await organizerRouteLoaderResolve({
        getOrganizerAccess: async () => createResultError("eventorenOrganizerAccessRead", "Sitzung ungültig"),
        returnTo: "/organizer/event/evt-42",
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
      search: { returnTo: "/organizer/event/evt-42" },
    })
  })

  test("returns authorized default payload for organizer role", async () => {
    const result = await organizerRouteLoaderResolve({
      getOrganizerAccess: async () => createResult(sampleUserProfile("organizer")),
      returnTo: "/organizer",
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      isServerAuthorized: true,
    })
  })

  test("returns authorized default payload for admin role", async () => {
    const result = await organizerRouteLoaderResolve({
      getOrganizerAccess: async () => createResult(sampleUserProfile("admin")),
      returnTo: "/organizer",
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      isServerAuthorized: true,
    })
  })

  test("returns authorized default payload for dev role", async () => {
    const result = await organizerRouteLoaderResolve({
      getOrganizerAccess: async () => createResult(sampleUserProfile("dev")),
      returnTo: "/organizer",
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      isServerAuthorized: true,
    })
  })

  test("includes custom payload when createPayload is provided", async () => {
    const result = await organizerRouteLoaderResolve({
      getOrganizerAccess: async () => createResult(sampleUserProfile("organizer")),
      returnTo: "/organizer/event/evt-42",
      createPayload: () => ({ eventId: "evt-42" }),
      redirect: () => {
        throw new Error("unexpected redirect")
      },
    })

    expect(result).toEqual({
      authorized: true,
      eventId: "evt-42",
    })
  })

  test("provides explicit German access-denied copy with organizer role requirement", () => {
    const text = organizerRouteText()

    expect(text.accessDeniedTitle).toBe("Veranstalter-Zugriff verweigert")
    expect(text.accessDeniedSubtitle).toBe("Für diesen Bereich ist eine Eventoren-Veranstalterrolle erforderlich.")
    expect(text.backToHome).toBe("Zurück zur Startseite")
  })
})
