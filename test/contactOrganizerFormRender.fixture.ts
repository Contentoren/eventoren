import { renderToString } from "solid-js/web"
import { ContactOrganizerForm } from "../src/contact/ContactOrganizerForm.tsx"
import { type ContactInquiryType, contactPageStateCreate } from "../src/contact/contactPageStateCreate.ts"

/** Server render of the contact form for one inquiry tab, used by the contact copy regression. */
export function contactOrganizerFormRender(inquiryType: ContactInquiryType): string {
  const state = contactPageStateCreate()
  state.inquiryType.set(inquiryType)

  return renderToString(() =>
    ContactOrganizerForm({
      inquiryType: state.inquiryType,
      name: state.name,
      email: state.email,
      organization: state.organization,
      eventType: state.eventType,
      expectedTickets: state.expectedTickets,
      message: state.message,
      isSubmitting: state.isSubmitting,
      isSubmitted: state.isSubmitted,
      onSubmit: (event: SubmitEvent) => state.submitForm(event),
      onReset: () => state.resetForm(),
    }),
  )
}
