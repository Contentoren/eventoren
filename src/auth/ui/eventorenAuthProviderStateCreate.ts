import { onCleanup, onMount } from "solid-js"
import { createResult, type PromiseResult, type Result } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import type { EventorenBrowserSession } from "#src/auth/model/EventorenBrowserSession.ts"
import { eventorenAuthIdentityCreate } from "#src/auth/model/eventorenAuthIdentityCreate.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { EventorenAuthContextValue } from "./eventorenAuthContext.ts"
import { eventorenBrowserSessionRead } from "./eventorenBrowserSessionRead.ts"
import { logoutMarkerConsumeStateCreate } from "./logoutMarkerConsumeStateCreate.ts"

type EventorenAuthProviderStateInputs = {
  readonly initialIdentity?: () => EventorenAuthIdentity | null
  readonly initialIdentityResult?: () => Result<EventorenAuthIdentity | null>
  readonly isDemo?: () => boolean
  readonly sessionRead?: typeof eventorenBrowserSessionRead
}

export function eventorenAuthProviderStateCreate(inputs: EventorenAuthProviderStateInputs) {
  const isDemo = () => inputs.isDemo?.() ?? false
  const initialIdentityResult = isDemo()
    ? createResult<EventorenAuthIdentity | null>(null)
    : (inputs.initialIdentityResult?.() ??
      (inputs.initialIdentity ? createResult(inputs.initialIdentity()) : undefined))
  const initialIdentity = initialIdentityResult?.success ? initialIdentityResult.data : undefined
  const identity = createSignalObject<EventorenAuthIdentity | null>(initialIdentity ?? null)
  const session = createSignalObject<EventorenBrowserSession | null>(null)
  const ready = createSignalObject(isDemo() || initialIdentityResult?.success === true)
  let bootstrapPromise: PromiseResult<EventorenAuthIdentity | null> | undefined
  let lifecycleVersion = 0
  let expiryTimer: ReturnType<typeof setTimeout> | undefined
  let refreshTimer: ReturnType<typeof setTimeout> | undefined

  const sessionApply = (value: EventorenBrowserSession | null) => {
    if (expiryTimer) clearTimeout(expiryTimer)
    if (refreshTimer) clearTimeout(refreshTimer)
    session.set(value && value.expiresAt > Date.now() ? value : null)
    identity.set(value && value.expiresAt > Date.now() ? eventorenAuthIdentityCreate(value.profile) : null)
    ready.set(true)
    if (!value) return
    expiryTimer = setTimeout(
      () => {
        if ((session.get()?.expiresAt ?? 0) <= Date.now()) clear()
      },
      Math.max(0, value.expiresAt - Date.now()),
    )
    refreshTimer = setTimeout(
      () => void refresh(),
      Math.min(5 * 60_000, Math.max(1_000, value.expiresAt - Date.now() - 30_000)),
    )
  }

  const clear = () => {
    lifecycleVersion += 1
    bootstrapPromise = undefined
    sessionApply(null)
  }

  const refresh = async (): PromiseResult<EventorenAuthIdentity | null> => {
    if (isDemo()) {
      clear()
      return createResult(null)
    }
    const version = ++lifecycleVersion
    const result = await (inputs.sessionRead ?? eventorenBrowserSessionRead)()
    if (version !== lifecycleVersion) return result.success ? createResult(identity.get()) : result
    if (!result.success) {
      sessionApply(null)
      return result
    }
    sessionApply(result.data)
    return createResult(identity.get())
  }

  const identityApply = (value: EventorenBrowserSession) => {
    lifecycleVersion += 1
    bootstrapPromise = undefined
    sessionApply(value)
  }

  const bootstrap = async (): PromiseResult<EventorenAuthIdentity | null> => {
    if (bootstrapPromise) return bootstrapPromise
    const pending = refresh()
    bootstrapPromise = pending
    try {
      return await pending
    } finally {
      if (bootstrapPromise === pending) bootstrapPromise = undefined
    }
  }

  logoutMarkerConsumeStateCreate({ clear })
  onMount(() => {
    if (isDemo()) {
      clear()
      return
    }
    void bootstrap()
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh()
    }
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    onCleanup(() => {
      lifecycleVersion += 1
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
      if (expiryTimer) clearTimeout(expiryTimer)
      if (refreshTimer) clearTimeout(refreshTimer)
    })
  })

  const context: EventorenAuthContextValue = {
    identity: () => {
      const activeSession = session.get()
      if (activeSession && activeSession.expiresAt <= Date.now()) return null
      return identity.get()
    },
    token: () => {
      const activeSession = session.get()
      if (!activeSession || activeSession.expiresAt <= Date.now()) return null
      return activeSession.token
    },
    ready: ready.get,
    identityApply,
    refresh,
    clear,
  }
  return { context, bootstrap }
}
