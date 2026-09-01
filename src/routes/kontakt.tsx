import { createFileRoute } from "@tanstack/solid-router"
import { SiteFrame } from "../components/SiteFrame"
import { ContactBenefitsList } from "../contact/ContactBenefitsList.tsx"
import { ContactDirectInfo } from "../contact/ContactDirectInfo.tsx"
import { ContactFaqList } from "../contact/ContactFaqList.tsx"
import { ContactHeader } from "../contact/ContactHeader.tsx"
import { ContactHeroBanner } from "../contact/ContactHeroBanner.tsx"
import { ContactOrganizerForm } from "../contact/ContactOrganizerForm.tsx"
import { contactPageStateCreate } from "../contact/contactPageStateCreate.ts"
import { seoHeadCreate } from "../seo/seoHeadCreate"
import { UiContainer } from "../ui/UiContainer.tsx"

export const Route = createFileRoute("/kontakt")({
  head: () => seoHeadCreate("/kontakt"),
  component: ContactPage,
})

function ContactPage() {
  const state = contactPageStateCreate()

  return (
    <SiteFrame>
      <main id="content" tabindex="-1">
        <ContactHeroBanner />

        <UiContainer width="wide" class="flex flex-col gap-space-7 py-space-7">
          <ContactHeader />

          <div class="grid gap-space-7 lg:grid-cols-[minmax(0,1fr)_22rem] xl:grid-cols-[minmax(0,1fr)_24rem]">
            <div class="flex flex-col gap-space-7">
              <ContactOrganizerForm
                inquiryType={state.inquiryType}
                setInquiryType={state.setInquiryType}
                name={state.name}
                setName={state.setName}
                email={state.email}
                setEmail={state.setEmail}
                organization={state.organization}
                setOrganization={state.setOrganization}
                eventType={state.eventType}
                setEventType={state.setEventType}
                expectedTickets={state.expectedTickets}
                setExpectedTickets={state.setExpectedTickets}
                message={state.message}
                setMessage={state.setMessage}
                isSubmitting={state.isSubmitting}
                isSubmitted={state.isSubmitted}
                onSubmit={(e) => state.submitForm(e)}
                onReset={() => state.resetForm()}
              />

              <ContactBenefitsList />

              <ContactFaqList expandedFaqId={state.expandedFaqId} onToggleFaq={(id) => state.toggleFaq(id)} />
            </div>

            <div class="lg:sticky lg:top-24 lg:self-start">
              <ContactDirectInfo />
            </div>
          </div>
        </UiContainer>
      </main>
    </SiteFrame>
  )
}
