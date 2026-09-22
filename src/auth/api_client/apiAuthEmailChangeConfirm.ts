import type { UserEmailChangeConfirmTypePublic } from "#src/auth/convex/user/email_change/userEmailChange2ConfirmMutation.ts"
import { eventorenEmailChangeConfirmServerFn } from "#src/auth/server/eventorenEmailChangeConfirmServerFn.ts"

export async function apiAuthEmailChangeConfirm(props: Omit<UserEmailChangeConfirmTypePublic, "token">) {
  return eventorenEmailChangeConfirmServerFn({ data: props })
}
