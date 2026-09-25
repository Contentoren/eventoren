import type { ParentComponent } from "solid-js"
import { Dynamic } from "solid-js/web"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { ContactDirectInfo } from "./ContactDirectInfo.tsx"
import { ContactFaqList } from "./ContactFaqList.tsx"
import { ContactHeader } from "./ContactHeader.tsx"
import { ContactOrganizerForm } from "./ContactOrganizerForm.tsx"
import type { contactPageStateCreate } from "./contactPageStateCreate.ts"

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
                name={state.name}
                email={state.email}
                organization={state.organization}
                eventType={state.eventType}
                expectedTickets={state.expectedTickets}
                message={state.message}
                isSubmitting={state.isSubmitting}
                isSubmitted={state.isSubmitted}
                onSubmit={(event) => state.submitForm(event)}
                onReset={() => state.resetForm()}
              />

              <ContactFaqList expandedFaqId={state.expandedFaqId} onToggleFaq={state.toggleFaq} />
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
