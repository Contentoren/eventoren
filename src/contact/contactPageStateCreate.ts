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
  const isSubmitting = createSignalObject(false)
  const isSubmitted = createSignalObject(inputs.initialSubmitted ?? false)
  const expandedFaqId = createSignalObject<string | null>("faq-1")

  const submitForm = (e: SubmitEvent) => {
    e.preventDefault()
    isSubmitting.set(true)

    // Simulate sending inquiry
    setTimeout(() => {
      isSubmitting.set(false)
      isSubmitted.set(true)
    }, 600)
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
