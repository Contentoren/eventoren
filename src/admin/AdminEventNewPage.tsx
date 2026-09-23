import { Show } from "solid-js"
import { UiContainer } from "../ui/UiContainer.tsx"
import { AdminEventDetailHeader } from "./AdminEventDetailHeader.tsx"
import { AdminEventDetailsForm } from "./AdminEventDetailsForm.tsx"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import { AdminEventTabs } from "./AdminEventTabs.tsx"
import { AdminTicketProductsForm } from "./AdminTicketProductsForm.tsx"
import type { adminEventNewRouteStateCreate } from "./adminEventNewRouteStateCreate.ts"

export function AdminEventNewPage(props: { state: ReturnType<typeof adminEventNewRouteStateCreate> }) {
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex max-w-4xl flex-col gap-6 py-8">
        <AdminEventDetailHeader
          event={props.state.catalog.selectedEvent()}
          isNew={!props.state.catalog.selectedEventKey()}
        />
        <AdminEventTabs tab={props.state.tab()} />
        <Show when={props.state.tab() === "products"} fallback={<AdminEventDetailsForm state={props.state.catalog} />}>
          <AdminEventFeedback state={props.state.catalog} />
          <Show when={!props.state.catalog.selectedEventKey()}>
            <p class="text-sm text-content-muted">
              Du kannst das Ticketprodukt direkt bearbeiten. Zum Speichern braucht das Event einen Titel unter
              „Details“; es wird dann zuerst als Entwurf angelegt.
            </p>
          </Show>
          <AdminTicketProductsForm state={props.state.catalog} formState={props.state.ticketForm} />
        </Show>
      </UiContainer>
    </main>
  )
}
