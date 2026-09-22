import { eventorenUserDeleteServerFn } from "#src/auth/server/eventorenUserDeleteServerFn.ts"

export async function apiAuthUserDelete() {
  return eventorenUserDeleteServerFn()
}
