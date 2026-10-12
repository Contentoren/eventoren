import { Link } from "@tanstack/solid-router"
import { Match, Show, Switch } from "solid-js"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { UiContainer } from "../ui/UiContainer.tsx"
import { AdminActivationCodesPanel } from "./AdminActivationCodesPanel.tsx"
import { AdminEventDetailHeader } from "./AdminEventDetailHeader.tsx"
import { AdminEventDetailsForm } from "./AdminEventDetailsForm.tsx"
import { AdminEventFeedback } from "./AdminEventFeedback.tsx"
import { AdminEventTabs } from "./AdminEventTabs.tsx"
import { AdminTicketProductsForm } from "./AdminTicketProductsForm.tsx"
import type { adminEventDetailRouteStateCreate } from "./adminEventDetailRouteStateCreate.ts"

export function AdminEventDetailPage(props: { state: ReturnType<typeof adminEventDetailRouteStateCreate> }) {
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="flex flex-col gap-6 py-6 sm:py-8">
        <Show
          when={props.state.event()}
          fallback={
            <CardWrapper class="rounded-xl border-0 shadow-lg shadow-slate-900/10 dark:shadow-black/30">
              <h1 class="text-xl font-semibold text-content">Event nicht gefunden</h1>
              <p class="mt-2 text-sm text-content-muted">Dieses Event ist nicht vorhanden oder nicht mehr verfügbar.</p>
              <Link
                to="/admin/events"
                class="mt-4 inline-block text-sm font-semibold text-brand-accent hover:underline"
              >
                Zurück zu Events
              </Link>
            </CardWrapper>
          }
        >
          {(event) => (
            <>
              <AdminEventDetailHeader event={event()} />
              <AdminEventTabs
                eventKey={props.state.eventKey()}
                tab={props.state.tab()}
                tierCount={event().tiers.length}
              />
              <Switch>
                <Match when={props.state.tab() === "products"}>
                  <AdminEventFeedback state={props.state.catalog} />
                  <AdminTicketProductsForm state={props.state.catalog} />
                </Match>
                <Match when={props.state.tab() === "codes"}>
                  <AdminActivationCodesPanel eventKey={props.state.eventKey} tiers={() => event().tiers} />
                </Match>
                <Match when={true}>
                  <AdminEventDetailsForm state={props.state.catalog} />
                </Match>
              </Switch>
            </>
          )}
        </Show>
      </UiContainer>
    </main>
  )
}
