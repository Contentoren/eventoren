import { useNavigate } from "@tanstack/solid-router"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

export function demoSignInEnterOtpPageStateCreate(error = false) {
  const navigate = useNavigate()
  const email = createSignalObject("alex@example.test")
  const code = createSignalObject("246810")
  const errorMessage = createSignalObject(error ? "Der Demo-Anmeldecode ist ungültig." : "")
  const isSubmitting = createSignalObject(false)

  const emailInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => email.set(event.currentTarget.value)
  const codeInput = (event: InputEvent & { currentTarget: HTMLInputElement }) => code.set(event.currentTarget.value)
  const submit = async (event: SubmitEvent) => {
    event.preventDefault()
    if (error) {
      errorMessage.set("Der Demo-Anmeldecode ist ungültig.")
      return
    }
    isSubmitting.set(true)
    await Promise.resolve()
    isSubmitting.set(false)
    navigate({ to: "/demo/customer/orders" })
  }

  return { email, code, errorMessage, isSubmitting, emailInput, codeInput, submit }
}
