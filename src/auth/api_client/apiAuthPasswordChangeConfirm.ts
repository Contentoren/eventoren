import type { UserPasswordChangeConfirmTypePublic } from "#src/auth/convex/user/pw_change/userPasswordChange2ConfirmMutation.ts"
import { eventorenPasswordChangeConfirmServerFn } from "#src/auth/server/eventorenPasswordChangeConfirmServerFn.ts"

export async function apiAuthPasswordChangeConfirm(props: Omit<UserPasswordChangeConfirmTypePublic, "token">) {
  return eventorenPasswordChangeConfirmServerFn({ data: props })
}
