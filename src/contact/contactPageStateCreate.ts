import { createSignalObject } from "#ui/utils/createSignalObject.js"

export type ContactInquiryType = "veranstalter" | "support"

export function contactPageStateCreate(inputs: { readonly initialSubmitted?: boolean } = {}) {
  const inquiryType = createSignalObject<ContactInquiryType>("veranstalter")
  const name = createSignalObject("")
  const email = createSignalObject("")
  const organization = createSignalObject("")
  const eventType = createSignalObject("Konzert / Festival")
  const expectedTickets = createSignalObject("100 - 500")
  const message = createSignalObject("")
  // Online submission is unavailable: no backend or email delivery exists, so
  // submitForm must never claim receipt. isSubmitting/isSubmitted/resetForm and
  // the inputs param stay for call-site compatibility until the demo submitted
  // variant is retired (follow-up for review, together with real delivery).
  const isSubmitting = createSignalObject(false)
  const isSubmitted = createSignalObject(inputs.initialSubmitted ?? false)
  const expandedFaqId = createSignalObject<string | null>("faq-1")

  const submitForm = (e: SubmitEvent) => {
    // No delivery exists: only stop navigation (e.g. Enter in a field).
    // Contact happens via the already-published mailto addresses.
    e.preventDefault()
  }

  const resetForm = () => {
    name.set("")
    email.set("")
    organization.set("")
    message.set("")
    isSubmitted.set(false)
  }

  const toggleFaq = (id: string) => {
    expandedFaqId.set(expandedFaqId.get() === id ? null : id)
  }

  return {
    inquiryType,
    name,
    email,
    organization,
    eventType,
    expectedTickets,
    message,
    isSubmitting,
    isSubmitted,
    expandedFaqId,
    submitForm,
    resetForm,
    toggleFaq,
  }
}
