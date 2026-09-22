import type { Result } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"

export type AdminRouteLoaderData<TEventsResult = unknown> =
  | {
      readonly authorized: false
    }
  | {
      readonly authorized: true
      readonly eventsResult: TEventsResult
      readonly isServerAuthorized: true
    }

export async function adminRouteLoaderResolve<TEventsResult>(inputs: {
  readonly getAdminAccess: () => Promise<Result<UserProfile>>
  readonly getCatalogEvents: () => Promise<TEventsResult>
  readonly redirect: (opts: { to: string; search?: Record<string, string> }) => unknown
}): Promise<AdminRouteLoaderData<TEventsResult>> {
  const accessResult = await inputs.getAdminAccess()
  if (!accessResult.success) {
    if (accessResult.errorMessage === "Eventoren-Adminrolle erforderlich") {
      return { authorized: false }
    }
    throw inputs.redirect({ to: "/sign-in", search: { returnTo: "/admin" } })
  }
  const eventsResult = await inputs.getCatalogEvents()
  return {
    authorized: true,
    eventsResult,
    isServerAuthorized: true,
  }
}
