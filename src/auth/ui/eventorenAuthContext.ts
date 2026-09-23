import type { Accessor } from "solid-js"
import { createContext } from "solid-js"
import type { PromiseResult } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"

export type EventorenAuthContextValue = {
  readonly identity: Accessor<EventorenAuthIdentity | null>
  readonly ready: Accessor<boolean>
  readonly identityApply: (identity: EventorenAuthIdentity) => void
  readonly refresh: () => PromiseResult<EventorenAuthIdentity | null>
  readonly clear: () => void
}

const eventorenAuthContextDefault: EventorenAuthContextValue = {
  identity: () => null,
  ready: () => false,
  identityApply: () => undefined,
  refresh: async () => ({ success: true, data: null }),
  clear: () => undefined,
}

export const eventorenAuthContext = createContext<EventorenAuthContextValue>(eventorenAuthContextDefault)
