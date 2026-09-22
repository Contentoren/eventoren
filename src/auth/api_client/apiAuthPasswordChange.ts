import type { UserPasswordChange1RequestTypePublic } from "#src/auth/convex/user/pw_change/userPasswordChange1RequestAction.ts"
import { eventorenPasswordChangeServerFn } from "#src/auth/server/eventorenPasswordChangeServerFn.ts"

export async function apiAuthPasswordChange(props: Omit<UserPasswordChange1RequestTypePublic, "token">) {
  return eventorenPasswordChangeServerFn({ data: props })
}
