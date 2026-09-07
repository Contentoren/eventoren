import { createMemo, createSignal } from "solid-js"

export function siteHeaderAuthDialogStateCreate() {
  const [email, setEmail] = createSignal("")
  const [mode, setMode] = createSignal<"anmelden" | "registrieren">("anmelden")
  const [submitted, setSubmitted] = createSignal(false)

  const isRegister = createMemo(() => mode() === "registrieren")

  const emailIsValid = createMemo(() => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email().trim()))

  const title = createMemo(() => (isRegister() ? "Konto erstellen" : "Anmelden"))

  const description = createMemo(() =>
    isRegister()
      ? "Erstelle dein Eventoren-Konto und sammle Punkte bei jeder Buchung."
      : "Melde dich an, um Buchungen, Wallet-Pässe und Rabatte zu verwalten.",
  )

  const submitLabel = createMemo(() => (isRegister() ? "Konto erstellen" : "Weiter mit E-Mail"))

  const switchLabel = createMemo(() => (isRegister() ? "Bereits ein Konto? Anmelden" : "Neu hier? Konto erstellen"))

  const statusMessage = createMemo(() => {
    if (!submitted()) return ""

    return `Wir haben einen Anmeldelink an ${email().trim()} gesendet.`
  })

  const changeEmail = (value: string) => {
    setEmail(value)
    setSubmitted(false)
  }

  const switchMode = () => {
    setMode((current) => (current === "anmelden" ? "registrieren" : "anmelden"))
    setSubmitted(false)
  }

  const submitEmail = () => {
    if (!emailIsValid()) return
    setSubmitted(true)
  }

  return {
    email,
    emailIsValid,
    isRegister,
    title,
    description,
    submitLabel,
    switchLabel,
    statusMessage,
    changeEmail,
    switchMode,
    submitEmail,
  }
}
