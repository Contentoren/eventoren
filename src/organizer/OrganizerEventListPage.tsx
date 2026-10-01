import { Link } from "@tanstack/solid-router"
import type { JSX, ParentComponent } from "solid-js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { Img } from "#ui/static/img/Img.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { eventImageErrorHandle } from "../events/eventImageErrorHandle.ts"
import { eventImageUrlGet } from "../events/eventImageUrlGet.ts"
import { UiContainer } from "../ui/UiContainer.tsx"
import { adminListViewPreferenceContextUse } from "../viewPreference/adminListViewPreferenceContextUse.ts"
import type { OrganizerEventListPageState } from "./OrganizerEventListPageState.ts"

export function OrganizerEventListPage(props: {
  readonly state: OrganizerEventListPageState
  readonly frame?: ParentComponent
  readonly eventHref?: (eventKey: string) => string
  readonly demoControls?: JSX.Element
}) {
  const state = props.state
  const viewPreference = adminListViewPreferenceContextUse()

  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1" class="flex-1">
        <UiContainer width="wide" class="flex flex-col gap-space-7 py-space-7 sm:py-10">
          <header class="flex flex-col gap-space-3">
            <h1 class="text-3xl font-semibold tracking-tight text-content sm:text-4xl">{state.text().eventsTitle}</h1>
            <p class="max-w-2xl text-content-muted">{state.text().eventsDescription}</p>
          </header>

          {props.demoControls}

          <Show when={state.errorMessage()}>
            <p
              role="alert"
              class="rounded-control border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger [.admin-workspace_&]:border-0"
            >
              {state.errorMessage()}
            </p>
          </Show>
          <Show when={state.loading()}>
            <p role="status" class="text-sm text-content-muted">
              {state.text().loading}
            </p>
          </Show>
          <Show when={!state.loading() && state.groups().length === 0 && !state.errorMessage()}>
            <CardWrapper class="[.admin-workspace_&]:rounded-xl [.admin-workspace_&]:border-0 [.admin-workspace_&]:shadow-lg [.admin-workspace_&]:shadow-slate-900/10 dark:[.admin-workspace_&]:shadow-black/30">
              <p class="text-content-muted">{state.text().noEvents}</p>
            </CardWrapper>
          </Show>

          <div class="flex flex-col gap-space-7">
            <For each={state.groups()}>
              {(group) => (
                <section aria-labelledby={`organizer-date-${group.key}`} class="flex flex-col gap-space-4">
                  <h2 id={`organizer-date-${group.key}`} class="text-xl font-semibold capitalize text-content">
                    {group.heading}
                  </h2>
                  <div
                    class={
                      viewPreference?.view() === "tiles"
                        ? "grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3"
                        : "flex flex-col gap-space-2"
                    }
                  >
                    <For each={group.events}>
                      {(event) => (
                        <CardWrapper class="group overflow-hidden p-0 transition-colors duration-200 hover:border-brand-accent hover:bg-surface-muted/40 [.admin-workspace_&]:rounded-xl [.admin-workspace_&]:border-0 [.admin-workspace_&]:shadow-md [.admin-workspace_&]:shadow-slate-900/10 dark:[.admin-workspace_&]:shadow-black/25">
                          <OrganizerEventCardLink
                            eventKey={event.eventKey}
                            eventHref={props.eventHref}
                            class={
                              viewPreference?.view() === "tiles"
                                ? "focus-ring flex h-full flex-col"
                                : "focus-ring flex items-center gap-space-3 p-space-2 sm:gap-space-4 sm:p-space-3"
                            }
                          >
                            <Img
                              src={eventImageUrlGet(event.imageVariants?.organizer ?? event.imageUrl)}
                              alt={event.imageAlt}
                              onError={eventImageErrorHandle}
                              class={
                                viewPreference?.view() === "tiles"
                                  ? "aspect-[16/9] w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                                  : "aspect-square w-16 shrink-0 rounded-control object-cover sm:w-20"
                              }
                            />
                            <div
                              class={
                                viewPreference?.view() === "tiles"
                                  ? "flex flex-1 flex-col gap-space-1 p-space-4"
                                  : "flex min-w-0 flex-1 flex-col gap-space-1"
                              }
                            >
                              <p class="text-sm font-semibold text-brand-accent">{state.eventTime(event.startsAt)}</p>
                              <h3
                                class={`text-lg font-semibold text-content transition-colors group-hover:text-brand-accent ${
                                  viewPreference?.view() === "tiles" ? "mt-space-1" : "truncate"
                                }`}
                              >
                                {event.title}
                              </h3>
                            </div>
                          </OrganizerEventCardLink>
                        </CardWrapper>
                      )}
                    </For>
                  </div>
                </section>
              )}
            </For>
          </div>
        </UiContainer>
      </main>
    </Dynamic>
  )
}

function OrganizerEventCardLink(props: {
  readonly eventKey: string
  readonly eventHref?: (eventKey: string) => string
  readonly class?: string
  readonly children: JSX.Element
}) {
  return (
    <Show
      when={props.eventHref}
      fallback={
        <Link to="/organizer/event/$eventId" params={{ eventId: props.eventKey }} class={props.class}>
          {props.children}
        </Link>
      }
    >
      {(eventHref) => (
        <Link to={eventHref()(props.eventKey)} class={props.class}>
          {props.children}
        </Link>
      )}
    </Show>
  )
}
