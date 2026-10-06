import type { Accessor } from "solid-js"
import { createContext } from "solid-js"
import type { PromiseResult } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import type { EventorenBrowserSession } from "#src/auth/model/EventorenBrowserSession.ts"

export type EventorenAuthContextValue = {
  readonly identity: Accessor<EventorenAuthIdentity | null>
  readonly token: Accessor<string | null>
  readonly ready: Accessor<boolean>
  readonly identityApply: (session: EventorenBrowserSession) => void
  readonly refresh: () => PromiseResult<EventorenAuthIdentity | null>
  readonly clear: () => void
}

const eventorenAuthContextDefault: EventorenAuthContextValue = {
  identity: () => null,
  token: () => null,
  ready: () => false,
  identityApply: () => undefined,
  refresh: async () => ({ success: true, data: null }),
  clear: () => undefined,
}

export const eventorenAuthContext = createContext<EventorenAuthContextValue>(eventorenAuthContextDefault)
