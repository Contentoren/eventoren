import { Link, useNavigate } from "@tanstack/solid-router"
import { Show } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { EventDetailPageView } from "../../events/EventDetailPageView.tsx"
import type { EventItem } from "../../events/EventItem.ts"
import { UiContainer } from "../../ui/UiContainer.tsx"
import { demoEventDetailPageStateCreate } from "../state/demoEventDetailPageStateCreate.ts"
import { demoFlowContextUse } from "../state/demoFlowContextUse.ts"
import { DemoSiteFrame } from "./DemoSiteFrame.tsx"

export function DemoEventDetail(props: { readonly event: EventItem; readonly isMissing?: boolean }) {
  const navigate = useNavigate()
  const flow = demoFlowContextUse()
  const state = demoEventDetailPageStateCreate({
    event: () => props.event,
    isMissing: () => Boolean(props.isMissing),
    flow,
    navigate,
  })

  return (
    <DemoSiteFrame currentId={props.isMissing ? "event-detail-missing" : "event-detail"}>
      <Show when={state.isLoading()}>
        <main id="content" tabindex="-1">
          <UiContainer class="py-space-7">
            <div
              class="rounded-card border border-border-subtle bg-surface-muted p-space-6 text-sm text-content-muted"
              aria-live="polite"
            >
              Event-Details werden geladen …
            </div>
          </UiContainer>
        </main>
      </Show>

      <Show when={state.isError()}>
        <main id="content" tabindex="-1">
          <UiContainer class="py-space-7">
            <div class="flex flex-wrap items-center justify-between gap-space-3 rounded-card border border-danger/50 bg-danger-soft p-space-6">
              <p class="text-sm text-danger" role="alert">
                Event-Details konnten nicht geladen werden. Bitte versuche es später erneut.
              </p>
              <Button variant="outline" size="sm" onClick={state.retry}>
                Erneut versuchen
              </Button>
            </div>
          </UiContainer>
        </main>
      </Show>

      <Show when={state.isEmpty()}>
        <main id="content" tabindex="-1">
          <UiContainer class="flex flex-col gap-space-4 py-space-7">
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft px-space-4 py-space-3 text-sm text-danger"
            >
              Das Event ist gerade nicht verfügbar. Bitte versuche es später erneut.
            </p>
            <div>
              <Link
                to="/demo/customer/events"
                class="focus-ring inline-flex h-10 items-center rounded-control border border-brand px-space-4 text-sm font-semibold text-brand-accent"
              >
                Zurück zum Eventkatalog
              </Link>
            </div>
          </UiContainer>
        </main>
      </Show>

      <Show when={state.isLoaded()}>
        <EventDetailPageView
          event={props.event}
          state={state}
          breadcrumb={
            <div class="flex flex-wrap items-center justify-between gap-space-3">
              <Link
                to="/demo/customer/events"
                class="focus-ring text-sm font-semibold text-brand-accent hover:underline"
              >
                ← Zurück zum Eventkatalog
              </Link>
              <Link
                to="/demo/admin/events"
                class="focus-ring text-sm font-medium text-content-muted hover:text-content hover:underline"
              >
                Im Admin-Katalog bearbeiten ↗
              </Link>
            </div>
          }
        />
      </Show>
    </DemoSiteFrame>
  )
}
