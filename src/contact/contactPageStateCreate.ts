import { createSignal } from "solid-js"

export type ContactInquiryType = "veranstalter" | "support"

export function contactPageStateCreate() {
  const [inquiryType, setInquiryType] = createSignal<ContactInquiryType>("veranstalter")
  const [name, setName] = createSignal("")
  const [email, setEmail] = createSignal("")
  const [organization, setOrganization] = createSignal("")
  const [eventType, setEventType] = createSignal("Konzert / Festival")
  const [expectedTickets, setExpectedTickets] = createSignal("100 - 500")
  const [message, setMessage] = createSignal("")
  const [isSubmitting, setIsSubmitting] = createSignal(false)
  const [isSubmitted, setIsSubmitted] = createSignal(false)
  const [expandedFaqId, setExpandedFaqId] = createSignal<string | null>("faq-1")

  const submitForm = (e: SubmitEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    // Simulate sending inquiry
    setTimeout(() => {
      setIsSubmitting(false)
      setIsSubmitted(true)
    }, 600)
  }

  const resetForm = () => {
    setName("")
    setEmail("")
    setOrganization("")
    setMessage("")
    setIsSubmitted(false)
  }

  const toggleFaq = (id: string) => {
    setExpandedFaqId((current) => (current === id ? null : id))
  }

  return {
    inquiryType,
    setInquiryType,
    name,
    setName,
    email,
    setEmail,
    organization,
    setOrganization,
    eventType,
    setEventType,
    expectedTickets,
    setExpectedTickets,
    message,
    setMessage,
    isSubmitting,
    isSubmitted,
    expandedFaqId,
    submitForm,
    resetForm,
    toggleFaq,
  }
}
