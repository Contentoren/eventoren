import { onMount } from "solid-js"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import type { EventorenAuthIdentity } from "#src/auth/model/EventorenAuthIdentity.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { EventorenAuthContextValue } from "./eventorenAuthContext.ts"
import { logoutMarkerConsumeStateCreate } from "./logoutMarkerConsumeStateCreate.ts"

type EventorenAuthProviderStateInputs = {
  readonly currentUserRead: () => PromiseResult<EventorenAuthIdentity | null>
  readonly initialIdentity?: () => EventorenAuthIdentity | null
  readonly initialIdentityResult?: () => Result<EventorenAuthIdentity | null>
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

      if (hasInitialIdentity) {
        if (!initialIdentityResult) {
          ready.set(false)
          return createResultError("eventorenAuthProviderInitialIdentity", "Die Anmeldung konnte nicht geprüft werden.")
        }
        if (!initialIdentityResult.success) {
          ready.set(false)
          return initialIdentityResult
        }
        if (version !== lifecycleVersion) return createResult(initialIdentityResult.data)
        identity.set(initialIdentityResult.data)
        ready.set(true)
        return createResult(initialIdentityResult.data)
      }

      const currentResult = await currentUserReadSafe()
      if (version !== lifecycleVersion) return currentResult.success ? createResult(currentResult.data) : currentResult
      if (!currentResult.success) {
        ready.set(false)
        return currentResult
      }
      identity.set(currentResult.data)
      ready.set(true)
      return currentResult
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
    clear,
  }
  return { context, bootstrap }
}
