import { Link } from "@tanstack/solid-router"
import type { JSX, ParentComponent } from "solid-js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
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
              class="rounded-control border border-danger/50 bg-danger-soft p-space-4 text-sm text-danger"
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
            <CardWrapper>
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
                        <CardWrapper
                          class={
                            viewPreference?.view() === "tiles"
                              ? "overflow-hidden p-0"
                              : "flex items-center gap-space-3 overflow-hidden p-space-2 sm:gap-space-4 sm:p-space-3"
                          }
                        >
                          <img
                            src={eventImageUrlGet(event.imageVariants?.organizer ?? event.imageUrl)}
                            alt={event.imageAlt}
                            loading="lazy"
                            decoding="async"
                            class={
                              viewPreference?.view() === "tiles"
                                ? "aspect-[16/9] w-full object-cover"
                                : "aspect-square w-16 shrink-0 rounded-control object-cover sm:w-20"
                            }
                          />
                          <div
                            class={
                              viewPreference?.view() === "tiles"
                                ? "flex flex-col gap-space-3 p-space-4"
                                : "flex min-w-0 flex-1 flex-col gap-space-2 sm:flex-row sm:items-center sm:justify-between"
                            }
                          >
                            <div>
                              <p class="text-sm font-semibold text-brand-accent">{state.eventTime(event.startsAt)}</p>
                              <h3 class="mt-space-1 text-lg font-semibold text-content">{event.title}</h3>
                            </div>
                            <Show
                              when={props.eventHref}
                              fallback={
                                <Link
                                  to="/organizer/event/$eventId"
                                  params={{ eventId: event.eventKey }}
                                  class="focus-ring inline-flex min-h-10 items-center justify-center rounded-control bg-brand px-space-4 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong"
                                >
                                  {state.text().eventOpen}
                                </Link>
                              }
                            >
                              {(eventHref) => (
                                <Link
                                  to={eventHref()(event.eventKey)}
                                  class="focus-ring inline-flex min-h-10 items-center justify-center rounded-control bg-brand px-space-4 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong"
                                >
                                  {state.text().eventOpen}
                                </Link>
                              )}
                            </Show>
                          </div>
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
