import { createEffect, type JSX } from "solid-js"
import type { Result } from "#result"
import { posthogIdentityApply } from "#src/app/analytics/posthogIdentityApply.ts"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { eventorenAuthContext } from "./eventorenAuthContext.ts"
import { eventorenAuthProviderStateCreate } from "./eventorenAuthProviderStateCreate.ts"

export function EventorenAuthProvider(props: {
  readonly children: JSX.Element
  readonly initialIdentity?: () => EventorenAuthIdentity | null
  readonly initialIdentityResult?: () => Result<EventorenAuthIdentity | null>
  readonly isDemo?: () => boolean
}) {
  const state = eventorenAuthProviderStateCreate({
    initialIdentity: props.initialIdentity,
    initialIdentityResult: props.initialIdentityResult,
    isDemo: props.isDemo,
  })
  createEffect(() => {
    void posthogIdentityApply(state.context.identity()?.userId ?? null)
  })

  return <eventorenAuthContext.Provider value={state.context}>{props.children}</eventorenAuthContext.Provider>
}
