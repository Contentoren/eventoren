import type { ParentComponent } from "solid-js"
import { Dynamic } from "solid-js/web"
import type { contactPageStateCreate } from "./contactPageStateCreate.ts"
import { ContactDirectInfo } from "./ContactDirectInfo.tsx"
import { ContactFaqList } from "./ContactFaqList.tsx"
import { ContactHeader } from "./ContactHeader.tsx"
import { ContactOrganizerForm } from "./ContactOrganizerForm.tsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"

export function ContactPageView(props: {
  readonly state: ReturnType<typeof contactPageStateCreate>
  readonly frame?: ParentComponent
}) {
  const state = props.state

  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1">
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
                onSubmit={(event) => state.submitForm(event)}
                onReset={() => state.resetForm()}
              />

              <ContactFaqList expandedFaqId={state.expandedFaqId} onToggleFaq={(id) => state.toggleFaq(id)} />
            </div>

            <div class="lg:sticky lg:top-24 lg:self-start">
              <ContactDirectInfo />
            </div>
          </div>
        </UiContainer>
      </main>
    </Dynamic>
  )
}
