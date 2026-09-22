import type { Result } from "#result"
import type { UserProfile } from "#src/auth/model/UserProfile.ts"
import type { OrganizerRouteLoaderData } from "./OrganizerRouteLoaderData.ts"

export async function organizerRouteLoaderResolve<TPayload = { readonly isServerAuthorized: true }>(inputs: {
  readonly getOrganizerAccess: () => Promise<Result<UserProfile>>
  readonly returnTo: string
  readonly createPayload?: () => TPayload
  readonly redirect: (opts: { to: string; search?: Record<string, string> }) => unknown
}): Promise<OrganizerRouteLoaderData<TPayload>> {
  const accessResult = await inputs.getOrganizerAccess()
  if (!accessResult.success) {
    if (accessResult.errorMessage === "Eventoren-Veranstalterrolle erforderlich") {
      return { authorized: false }
    }
    throw inputs.redirect({ to: "/sign-in", search: { returnTo: inputs.returnTo } })
  }
  const payload = inputs.createPayload ? inputs.createPayload() : ({ isServerAuthorized: true } as unknown as TPayload)
  return {
    authorized: true,
    ...payload,
  }
}
