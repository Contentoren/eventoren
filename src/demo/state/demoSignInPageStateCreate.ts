import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"
import type { SignInPageState } from "../../auth/ui/SignInPageState.ts"

export function demoSignInPageStateCreate(error = false): SignInPageState {
  const navigate = useNavigate()
  const email = createSignalObject("alex@example.test")
  const password = createSignalObject("demo-password")
  const isSubmitting = createSignalObject(false)
  const errorMessage = createSignalObject(error ? "Die Demo-Anmeldung wurde abgelehnt. Versuche es erneut." : "")
  const returnTo = () => "/demo/orders"
  const loginUrl = () => "/demo/orders"

  const emailInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => email.set(event.currentTarget.value)
  const passwordInput = (event: InputEvent & { currentTarget: HTMLInputElement }) =>
    password.set(event.currentTarget.value)
  const submitPassword = async (event: SubmitEvent) => {
    event.preventDefault()
    if (error) {
      errorMessage.set("Die Demo-Anmeldung wurde abgelehnt. Versuche es erneut.")
      return
    }
    isSubmitting.set(true)
    await Promise.resolve()
    isSubmitting.set(false)
    navigate({ to: "/demo/orders" })
  }
  const submitEmail = async (event: SubmitEvent) => {
    event.preventDefault()
    if (error) {
      errorMessage.set("Der Demo-Anmeldecode konnte nicht angefordert werden.")
      return
    }
    navigate({ to: "/demo/auth/otp" })
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
