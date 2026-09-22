import type { UserEmailChangeTypePublic } from "#src/auth/convex/user/email_change/userEmailChange1RequestAction.ts"
import { eventorenEmailChangeServerFn } from "#src/auth/server/eventorenEmailChangeServerFn.ts"

export async function apiAuthEmailChange(props: Omit<UserEmailChangeTypePublic, "token">) {
  return eventorenEmailChangeServerFn({ data: props })
}
