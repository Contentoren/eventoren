import { onMount } from "solid-js"
import { languageDefault } from "#src/app/i18n/language.ts"
import { apiAuthSignInViaEmail } from "#src/auth/api_client/apiAuthSignInViaEmail.ts"
import { apiAuthSignInViaPw } from "#src/auth/api_client/apiAuthSignInViaPw.ts"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"
import { userSessionsSignalAdd } from "#src/auth/ui/signals/userSessionsSignal.ts"
import { userSessionCallbackConsume } from "#src/auth/ui/userSessionCallbackConsume.ts"
import { urlSignInEnterOtp } from "#src/auth/url/urlSignInEnterOtp.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function signInPageStateCreate(inputs: { readonly returnTo: () => string | undefined }) {
  const errorMessage = createSignalObject("")
  const email = createSignalObject("")
  const password = createSignalObject("")
  const isSubmitting = createSignalObject(false)
  const returnTo = () => safeReturnTo(inputs.returnTo())
  const loginUrl = () => `/login/zitadel?returnTo=${encodeURIComponent(returnTo())}`

  const emailInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => email.set(event.currentTarget.value)
  const passwordInput = (event: InputEvent & { currentTarget: HTMLInputElement }) =>
    password.set(event.currentTarget.value)

  const submitPassword = async (event: SubmitEvent) => {
    event.preventDefault()
    await submit(
      () => apiAuthSignInViaPw({ email: email.get(), pw: password.get(), l: languageDefault }),
      (session) => {
        userSessionsSignalAdd(session)
        userSessionSignal.set(session)
        window.location.assign(returnTo())
      },
    )
  }

  const submitEmail = async (event: SubmitEvent) => {
    event.preventDefault()
    await submit(
      () => apiAuthSignInViaEmail({ email: email.get(), l: languageDefault }),
      () => window.location.assign(urlSignInEnterOtp(email.get(), undefined, returnTo())),
    )
  }

  onMount(() => {
    const consumeResult = userSessionCallbackConsume(window.location.href)
    if (!consumeResult.success || !consumeResult.data.hasUserSession) return
    if (!consumeResult.data.sessionPersisted) {
      errorMessage.set("Die Anmeldung konnte nicht übernommen werden. Bitte versuche es erneut.")
      return
    }
    window.location.assign(returnTo())
  })

  async function submit<T>(
    request: () => Promise<{ success: true; data: T } | { success: false; errorMessage?: string }>,
    onSuccess: (data: T) => void,
  ) {
    errorMessage.set("")
    isSubmitting.set(true)
    const result = await request()
    isSubmitting.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Die Anmeldung ist fehlgeschlagen.")
      return
    }
    onSuccess(result.data)
  }

  return {
    email,
    password,
    isSubmitting,
    errorMessage: errorMessage.get,
    emailInput,
    passwordInput,
    submitPassword,
    submitEmail,
    loginUrl,
    returnTo,
  }
}

function safeReturnTo(value: string | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  return value
}
