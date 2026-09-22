import { onMount } from "solid-js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import type { UserSession } from "#src/auth/model/UserSession.ts"
import { userSessionBrowserRestore } from "#src/auth/ui/signals/userSessionBrowserRestore.ts"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"
import { userSessionsClear } from "#src/auth/ui/signals/userSessionsClear.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { EventorenAuthContextValue } from "./eventorenAuthContext.ts"
import { logoutMarkerConsumeStateCreate } from "./logoutMarkerConsumeStateCreate.ts"

type EventorenAuthProviderStateInputs = {
  readonly currentUserRead: () => PromiseResult<EventorenAuthIdentity | null>
  readonly sessionAdopt: (session: UserSession, mode: "legacy" | "replace") => PromiseResult<EventorenAuthIdentity>
  readonly initialIdentity?: () => EventorenAuthIdentity | null
  readonly initialIdentityResult?: () => Result<EventorenAuthIdentity | null>
  readonly legacySessionRead?: () => UserSession | null
  readonly legacySessionClear?: () => void
  readonly isDemo?: () => boolean
}

export function eventorenAuthProviderStateCreate(inputs: EventorenAuthProviderStateInputs) {
  const isDemo = () => inputs.isDemo?.() ?? false
  const initialIdentityResult = isDemo()
    ? createResult<EventorenAuthIdentity | null>(null)
    : (inputs.initialIdentityResult?.() ??
      (inputs.initialIdentity ? createResult(inputs.initialIdentity()) : undefined))
  const initialIdentity = initialIdentityResult?.success ? initialIdentityResult.data : undefined
  const hasInitialIdentity = !isDemo() && initialIdentityResult !== undefined
  const identity = createSignalObject<EventorenAuthIdentity | null>(initialIdentity ?? null)
  const ready = createSignalObject(
    isDemo() || (initialIdentityResult?.success === true && initialIdentityResult.data !== null),
  )
  const currentUserRead = inputs.currentUserRead
  const sessionAdopt = inputs.sessionAdopt
  const legacySessionRead =
    inputs.legacySessionRead ??
    (() => {
      userSessionBrowserRestore()
      return userSessionSignal.get()
    })
  const legacySessionClear = inputs.legacySessionClear ?? userSessionsClear
  let bootstrapPromise: PromiseResult<EventorenAuthIdentity | null> | undefined
  let lifecycleVersion = 0

  const currentUserReadSafe = async (): PromiseResult<EventorenAuthIdentity | null> => {
    if (isDemo()) return createResult(null)
    try {
      return await currentUserRead()
    } catch (error) {
      return createResultError(
        "eventorenAuthProviderCurrentUserRead",
        "Die Anmeldung konnte nicht geprüft werden.",
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const sessionAdoptSafe = async (
    session: UserSession,
    mode: "legacy" | "replace",
  ): PromiseResult<EventorenAuthIdentity> => {
    if (isDemo()) return createResultError("eventorenAuthProviderDemoSessionAdopt", "Demo-Sitzungen sind deaktiviert.")
    try {
      return await sessionAdopt(session, mode)
    } catch (error) {
      return createResultError(
        "eventorenAuthProviderSessionAdopt",
        "Die Anmeldung konnte nicht übernommen werden.",
        error instanceof Error ? error.message : String(error),
      )
    }
  }

  const refresh = async (): PromiseResult<EventorenAuthIdentity | null> => {
    const version = lifecycleVersion
    if (isDemo()) {
      identity.set(null)
      ready.set(true)
      return createResult(null)
    }
    const result = await currentUserReadSafe()
    if (version !== lifecycleVersion) return result
    if (!result.success) {
      ready.set(false)
      return result
    }
    identity.set(result.data)
    ready.set(true)
    return result
  }

  const adoptSession = async (session: UserSession): PromiseResult<EventorenAuthIdentity> => {
    const version = lifecycleVersion
    if (isDemo()) {
      ready.set(true)
      return createResultError("eventorenAuthProviderDemoSessionAdopt", "Demo-Sitzungen sind deaktiviert.")
    }
    const result = await sessionAdoptSafe(session, "replace")
    if (version !== lifecycleVersion) return result
    if (!result.success) {
      ready.set(true)
      return result
    }
    identity.set(result.data)
    ready.set(true)
    return result
  }

  const identityApply = (value: EventorenAuthIdentity) => {
    lifecycleVersion += 1
    bootstrapPromise = undefined
    identity.set(value)
    ready.set(true)
  }

  const clear = () => {
    lifecycleVersion += 1
    bootstrapPromise = undefined
    identity.set(null)
    ready.set(true)
  }

  const bootstrap = async (): PromiseResult<EventorenAuthIdentity | null> => {
    if (bootstrapPromise) return bootstrapPromise
    const version = lifecycleVersion
    const pending = (async () => {
      if (isDemo()) {
        identity.set(null)
        ready.set(true)
        return createResult(null)
      }

      if (hasInitialIdentity && initialIdentity) {
        if (version !== lifecycleVersion) return createResult(initialIdentity)
        identity.set(initialIdentity)
        ready.set(true)
        return createResult(initialIdentity)
      }

      if (hasInitialIdentity) {
        if (!initialIdentityResult) {
          ready.set(false)
          return createResultError("eventorenAuthProviderInitialIdentity", "Die Anmeldung konnte nicht geprüft werden.")
        }
        if (!initialIdentityResult.success) {
          ready.set(false)
          return initialIdentityResult
        }

        const legacySession = legacySessionRead()
        if (!legacySession) {
          if (version !== lifecycleVersion) return createResult(null)
          identity.set(null)
          ready.set(true)
          return createResult(null)
        }

        const adoptionResult = await sessionAdoptSafe(legacySession, "legacy")
        if (version !== lifecycleVersion) return createResult(adoptionResult.success ? adoptionResult.data : null)
        if (!adoptionResult.success) {
          legacySessionClear()
          identity.set(null)
          ready.set(true)
          return createResult(null)
        }

        if (adoptionResult.data.userId !== legacySession.profile.userId) legacySessionClear()
        identity.set(adoptionResult.data)
        ready.set(true)
        return createResult(adoptionResult.data)
      }

      const currentResult = await currentUserReadSafe()
      if (version !== lifecycleVersion) return currentResult.success ? createResult(currentResult.data) : currentResult
      if (!currentResult.success) {
        ready.set(false)
        return currentResult
      }
      if (currentResult.data) {
        const browserSession = userSessionSignal.get()
        if (browserSession && browserSession.profile.userId !== currentResult.data.userId) userSessionsClear()
        identity.set(currentResult.data)
        ready.set(true)
        return currentResult
      }

      const legacySession = legacySessionRead()
      if (!legacySession) {
        if (version !== lifecycleVersion) return createResult(null)
        identity.set(null)
        ready.set(true)
        return createResult(null)
      }

      const adoptionResult = await sessionAdoptSafe(legacySession, "legacy")
      if (version !== lifecycleVersion) return createResult(adoptionResult.success ? adoptionResult.data : null)
      if (!adoptionResult.success) {
        legacySessionClear()
        identity.set(null)
        ready.set(true)
        return createResult(null)
      }

      if (adoptionResult.data.userId !== legacySession.profile.userId) legacySessionClear()
      identity.set(adoptionResult.data)
      ready.set(true)
      return createResult(adoptionResult.data)
    })()
    bootstrapPromise = pending
    return pending
  }

  logoutMarkerConsumeStateCreate({ clear })
  onMount(() => {
    if (!isDemo()) void bootstrap()
  })

  const context: EventorenAuthContextValue = {
    identity: identity.get,
    ready: ready.get,
    identityApply,
    refresh,
    adoptSession,
    clear,
  }
  return { context, bootstrap }
}
