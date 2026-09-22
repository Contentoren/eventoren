import { createEffect, onMount } from "solid-js"
import { eventorenSsoAttemptRecord } from "#src/auth/model/eventorenSsoAttemptRecord.ts"
import { eventorenSsoAttemptsReset } from "#src/auth/model/eventorenSsoAttemptsReset.ts"
import { eventorenSsoPreferenceRead } from "#src/auth/model/eventorenSsoPreferenceRead.ts"
import { eventorenSsoPreferenceWrite } from "#src/auth/model/eventorenSsoPreferenceWrite.ts"
import { eventorenSsoReturnToResolve } from "#src/auth/model/eventorenSsoReturnToResolve.ts"
import { userSessionCallbackConsume } from "#src/auth/ui/userSessionCallbackConsume.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import { eventorenAuthContextUse } from "./eventorenAuthContextUse.ts"

export function eventorenSsoPageStateCreate(inputs: {
  readonly returnTo: () => string | undefined
  readonly isServerAuthorized?: () => boolean | undefined
}) {
  const pending = createSignalObject(false)
  const errorMessage = createSignalObject<string | null>(null)
  const autoSignIn = createSignalObject(eventorenSsoPreferenceRead())
  const auth = eventorenAuthContextUse()

  const returnTarget = () => eventorenSsoReturnToResolve(inputs.returnTo())

  const isAuthenticated = () => (inputs.isServerAuthorized?.() ?? false) || (auth.ready() && auth.identity() !== null)

  const login = () => {
    pending.set(true)
    errorMessage.set(null)
    const target = returnTarget()
    const destination = `/login/zitadel?returnTo=${encodeURIComponent(target)}`
    if (typeof window !== "undefined") {
      window.location.assign(destination)
    }
  }

  const retrySession = () => {
    void auth.refresh().then((result) => {
      if (!result.success || !result.data) return
      eventorenSsoAttemptsReset()
      if (typeof window !== "undefined") window.location.assign(returnTarget())
    })
  }

  onMount(() => {
    const consumeResult = userSessionCallbackConsume(window.location.href)
    if (consumeResult.success && consumeResult.data.hasUserSession && consumeResult.data.sessionPersisted) {
      eventorenSsoAttemptsReset()
      if (typeof window !== "undefined") {
        window.location.assign(returnTarget())
      }
    }
  })

  let hasNavigatedAuthenticated = false
  createEffect(() => {
    if (hasNavigatedAuthenticated) return
    if (isAuthenticated()) {
      hasNavigatedAuthenticated = true
      eventorenSsoAttemptsReset()
      if (typeof window !== "undefined") {
        window.location.assign(returnTarget())
      }
    }
  })

  let autoSignInInitiated = false
  createEffect(() => {
    if (autoSignInInitiated) return
    if (isAuthenticated()) return
    if (!autoSignIn.get()) return

    const record = eventorenSsoAttemptRecord()
    if (!record.success) {
      errorMessage.set(record.errorMessage)
      return
    }
    if (!record.data.allowed) {
      errorMessage.set("Automatic sign-in was paused after multiple attempts. Please sign in manually.")
      return
    }

    autoSignInInitiated = true
    login()
  })

  const autoSignInToggle = (enabled: boolean) => {
    const preferenceWrite = eventorenSsoPreferenceWrite(enabled)
    if (!preferenceWrite.success) {
      errorMessage.set(preferenceWrite.errorMessage)
      return
    }

    autoSignIn.set(enabled)
    if (!enabled) return

    autoSignInInitiated = true
    const record = eventorenSsoAttemptRecord()
    if (!record.success) {
      errorMessage.set(record.errorMessage)
      return
    }
    if (!record.data.allowed) {
      errorMessage.set("Automatic sign-in was paused after multiple attempts. Please sign in manually.")
      return
    }

    login()
  }

  return {
    isPending: pending.get,
    errorMessage: errorMessage.get,
    autoSignIn: autoSignIn.get,
    autoSignInToggle,
    loginClick: login,
    retrySession,
    returnTarget,
  }
}
