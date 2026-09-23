import type { JSX } from "solid-js"
import type { Result } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { eventorenCurrentUserServerFn } from "#src/auth/server/eventorenCurrentUserServerFn.ts"
import { eventorenAuthContext } from "./eventorenAuthContext.ts"
import { eventorenAuthProviderStateCreate } from "./eventorenAuthProviderStateCreate.ts"

export function EventorenAuthProvider(props: {
  readonly children: JSX.Element
  readonly initialIdentity?: () => EventorenAuthIdentity | null
  readonly initialIdentityResult?: () => Result<EventorenAuthIdentity | null>
  readonly isDemo?: () => boolean
}) {
  const state = eventorenAuthProviderStateCreate({
    currentUserRead: () => eventorenCurrentUserServerFn(),
    initialIdentity: props.initialIdentity,
    initialIdentityResult: props.initialIdentityResult,
    isDemo: props.isDemo,
  })

  return <eventorenAuthContext.Provider value={state.context}>{props.children}</eventorenAuthContext.Provider>
}
