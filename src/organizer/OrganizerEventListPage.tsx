import { Link } from "@tanstack/solid-router"
import type { JSX, ParentComponent } from "solid-js"
import { For, Show } from "solid-js"
import { Dynamic } from "solid-js/web"
import { CardWrapper } from "#ui/static/card/CardWrapper.jsx"
import { SiteFrame } from "../components/SiteFrame.tsx"
import { eventImageUrlGet } from "../events/eventImageUrlGet.ts"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { OrganizerEventListPageState } from "./OrganizerEventListPageState.ts"

export function OrganizerEventListPage(props: {
  readonly state: OrganizerEventListPageState
  readonly frame?: ParentComponent
  readonly eventHref?: (eventKey: string) => string
  readonly demoControls?: JSX.Element
}) {
  const state = props.state

  return (
    <Dynamic component={props.frame ?? SiteFrame}>
      <main id="content" tabindex="-1" class="flex-1">
        <UiContainer width="wide" class="flex flex-col gap-space-8 py-space-8 sm:py-space-10">
          <header class="flex flex-col gap-space-3">
            <p class="text-sm font-semibold uppercase tracking-widest text-brand-accent">{state.text().area}</p>
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

          <div class="flex flex-col gap-space-8">
            <For each={state.groups()}>
              {(group) => (
                <section aria-labelledby={`organizer-date-${group.key}`} class="flex flex-col gap-space-4">
                  <h2 id={`organizer-date-${group.key}`} class="text-xl font-semibold capitalize text-content">
                    {group.heading}
                  </h2>
                  <div class="grid gap-space-4 sm:grid-cols-2 lg:grid-cols-3">
                    <For each={group.events}>
                      {(event) => (
                        <CardWrapper class="overflow-hidden p-0">
                          <img
                            src={eventImageUrlGet(event.imageUrl)}
                            alt={event.imageAlt}
                            loading="lazy"
                            decoding="async"
                            class="aspect-[16/9] w-full object-cover"
                          />
                          <div class="flex flex-col gap-space-3 p-space-4">
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
                                <a
                                  href={eventHref()(event.eventKey)}
                                  class="focus-ring inline-flex min-h-10 items-center justify-center rounded-control bg-brand px-space-4 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong"
                                >
                                  {state.text().eventOpen}
                                </a>
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
