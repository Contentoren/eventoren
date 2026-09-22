import type { UserProfileFieldsTypePublic } from "#src/auth/convex/user/profile_update/userProfileUpdateMutation.ts"
import { eventorenProfileUpdateServerFn } from "#src/auth/server/eventorenProfileUpdateServerFn.ts"

export async function apiAuthProfileUpdate(props: Omit<UserProfileFieldsTypePublic, "token">) {
  return eventorenProfileUpdateServerFn({ data: props })
}
