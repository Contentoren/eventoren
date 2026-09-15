import { createFileRoute } from "@tanstack/solid-router"
import { ContactPageView } from "../contact/ContactPageView.tsx"
import { contactPageStateCreate } from "../contact/contactPageStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate.ts"

export const Route = createFileRoute("/kontakt")({
  head: () => seoHeadCreate("/kontakt"),
  component: ContactPage,
})

function ContactPage() {
  const state = contactPageStateCreate()
  return <ContactPageView state={state} />
}
