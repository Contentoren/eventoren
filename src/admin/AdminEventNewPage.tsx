import { UiContainer } from "../ui/UiContainer.tsx"
import { AdminEventDetailHeader } from "./AdminEventDetailHeader.tsx"
import { AdminEventDetailsForm } from "./AdminEventDetailsForm.tsx"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import type { adminEventNewRouteStateCreate } from "./adminEventNewRouteStateCreate.ts"

export function AdminEventNewPage(props: { state: ReturnType<typeof adminEventNewRouteStateCreate> }) {
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex max-w-4xl flex-col gap-6 py-8">
        <AdminEventDetailHeader isNew />
        <AdminEventFeedback state={props.state.catalog} />
        <AdminEventDetailsForm state={props.state.catalog} onSaved={props.state.eventSaved} />
      </UiContainer>
    </main>
  )
}
