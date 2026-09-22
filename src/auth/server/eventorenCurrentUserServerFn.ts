import { createServerFn } from "@tanstack/solid-start"
import { createResult, type PromiseResult } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { eventorenAuthIdentityCreate } from "#src/auth/model/eventorenAuthIdentityCreate.ts"
import { eventorenCurrentUserRead } from "./eventorenCurrentUserRead.ts"

export const eventorenCurrentUserServerFn = createServerFn({ method: "GET" }).handler(
  async (): PromiseResult<EventorenAuthIdentity | null> => {
    const result = await eventorenCurrentUserRead()
    if (!result.success) return result
    return createResult<EventorenAuthIdentity | null>(result.data ? eventorenAuthIdentityCreate(result.data) : null)
  },
)
