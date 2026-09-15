import { languageDefault } from "#src/app/i18n/language.ts"
import { apiAuthSignInViaEmailEnterOtp } from "#src/auth/api_client/apiAuthSignInViaEmailEnterOtp.ts"
import { userSessionSignal } from "#src/auth/ui/signals/userSessionSignal.ts"
import { userSessionsSignalAdd } from "#src/auth/ui/signals/userSessionsSignal.ts"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"

export function signInEnterOtpPageStateCreate(inputs: {
  readonly initialEmail: () => string | undefined
  readonly initialCode: () => string | undefined
  readonly returnTo: () => string | undefined
}) {
  const email = createSignalObject(inputs.initialEmail() ?? "")
  const code = createSignalObject(inputs.initialCode() ?? "")
  const errorMessage = createSignalObject("")
  const isSubmitting = createSignalObject(false)

  const emailInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => email.set(event.currentTarget.value)
  const codeInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => code.set(event.currentTarget.value)

  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    errorMessage.set("")
    isSubmitting.set(true)
    const result = await apiAuthSignInViaEmailEnterOtp({ email: email.get(), code: code.get(), l: languageDefault })
    isSubmitting.set(false)
    if (!result.success) {
      errorMessage.set(result.errorMessage || "Die Anmeldung ist fehlgeschlagen.")
      return
    }
    userSessionsSignalAdd(result.data)
    userSessionSignal.set(result.data)
    window.location.assign(safeReturnTo(inputs.returnTo()))
  }

  return { email, code, errorMessage, isSubmitting, emailInput, codeInput, submit }
}

function safeReturnTo(value: string | undefined): string {
  if (!value?.startsWith("/") || value.startsWith("//") || value.includes("\\")) return "/"
  return value
}
