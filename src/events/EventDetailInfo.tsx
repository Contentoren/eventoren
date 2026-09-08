import { For, type JSX, Show } from "solid-js"
import { classArr } from "../ui/classArr.ts"
import type { EventItem } from "./EventItem.ts"
import { eventDetailInfoStateCreate } from "./eventDetailInfoStateCreate.ts"

export function EventDetailInfo(props: { event: EventItem; children?: JSX.Element }) {
  const state = eventDetailInfoStateCreate({ event: () => props.event })

  return (
    <div class="flex flex-col gap-space-7">
      <section aria-labelledby="event-description" class="flex flex-col gap-space-4">
        <h2 id="event-description" class="text-xl font-semibold text-content">
          Über dieses Event
        </h2>
        <p class="text-base leading-relaxed text-content-muted">{state.description()}</p>

        <Show when={state.hasHighlights()}>
          <div class="flex flex-col gap-space-3 pt-space-2">
            <h3 class="text-xs font-semibold uppercase tracking-wider text-content-muted">Line-up & Highlights</h3>
            <ul class="divide-y divide-border-subtle/40 border-y border-border-subtle/40">
              <For each={state.highlights()}>
                {(item, index) => {
                  const contentId = `event-highlight-panel-${index()}`
                  const buttonId = `event-highlight-button-${index()}`

                  return (
                    <li>
                      <button
                        id={buttonId}
                        type="button"
                        class="group flex w-full items-center justify-between gap-space-4 py-space-4 text-left transition-colors focus-visible:focus-ring"
                        aria-expanded={state.isHighlightExpanded(item.tag)}
                        aria-controls={contentId}
                        onClick={() => state.toggleHighlight(item.tag)}
                      >
                        <div class="flex flex-col gap-0.5">
                          <span class="text-sm font-semibold text-content transition-colors group-hover:text-brand-accent">
                            {item.title}
                          </span>
                          <span class="text-xs text-content-muted">{item.descriptor}</span>
                        </div>
                        <div
                          class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-muted/40 text-content-muted transition-colors group-hover:border-border-strong group-hover:text-content"
                          aria-hidden="true"
                        >
                          <svg
                            class={classArr(
                              "size-4 stroke-[2] transition-transform duration-200",
                              state.isHighlightExpanded(item.tag) && "rotate-180",
                            )}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M3.5 6l4.5 4.5 4.5-4.5" />
                          </svg>
                        </div>
                      </button>

                      <Show when={state.isHighlightExpanded(item.tag)}>
                        <div
                          id={contentId}
                          role="region"
                          aria-labelledby={buttonId}
                          class="pb-space-4 pt-space-1 text-sm leading-relaxed text-content-muted"
                        >
                          {item.detail}
                        </div>
                      </Show>
                    </li>
                  )
                }}
              </For>
            </ul>
          </div>
        </Show>

        <div class="flex flex-col gap-space-4 pt-space-2">
          <h2 class="text-xl font-semibold text-content">Dein Erlebnis, deine Erinnerungen</h2>
          <div class="grid grid-cols-1 gap-space-3 sm:grid-cols-2">
            <div class="group relative h-72 overflow-hidden rounded-card border border-border-subtle/60 bg-surface-muted sm:h-full sm:min-h-full">
              <img
                src={state.collageImages()[0].src}
                alt={state.collageImages()[0].alt}
                loading="lazy"
                class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <div class="grid grid-cols-2 gap-space-3 sm:grid-cols-1">
              <div class="group relative h-40 overflow-hidden rounded-card border border-border-subtle/60 bg-surface-muted sm:h-60">
                <img
                  src={state.collageImages()[1].src}
                  alt={state.collageImages()[1].alt}
                  loading="lazy"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <div class="group relative h-40 overflow-hidden rounded-card border border-border-subtle/60 bg-surface-muted sm:h-60">
                <img
                  src={state.collageImages()[2].src}
                  alt={state.collageImages()[2].alt}
                  loading="lazy"
                  class="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                />
              </div>
            </div>
          </div>
        </div>

        <Show when={state.hasInclusions()}>
          <div class="flex flex-col border-t border-border-subtle/40 pt-space-4">
            <button
              id="event-inclusions-button"
              type="button"
              class="group flex w-full items-center justify-between gap-space-4 py-space-2 text-left transition-colors focus-visible:focus-ring"
              aria-expanded={state.isInclusionsExpanded()}
              aria-controls="event-inclusions-panel"
              onClick={() => state.toggleInclusions()}
            >
              <span class="text-xl font-semibold text-content transition-colors group-hover:text-brand-accent">
                Inklusive
              </span>
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-muted/40 text-content-muted transition-colors group-hover:border-border-strong group-hover:text-content"
                aria-hidden="true"
              >
                <svg
                  class={classArr(
                    "size-4 stroke-[2] transition-transform duration-200",
                    state.isInclusionsExpanded() && "rotate-180",
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3.5 6l4.5 4.5 4.5-4.5" />
                </svg>
              </div>
            </button>

            <Show when={state.isInclusionsExpanded()}>
              <div
                id="event-inclusions-panel"
                role="region"
                aria-labelledby="event-inclusions-button"
                class="pb-space-2 pt-space-3"
              >
                <ul class="flex flex-col gap-space-3">
                  <For each={state.inclusions()}>
                    {(inclusion) => (
                      <li class="flex items-start gap-space-3 text-sm leading-relaxed text-content-muted sm:text-base">
                        <span
                          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-success-soft text-success"
                          aria-hidden="true"
                        >
                          <svg
                            class="size-3 stroke-[2.5]"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M3.5 8.5l3 3 6-6" />
                          </svg>
                        </span>
                        <span>{inclusion}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={state.hasExclusions()}>
          <div class="flex flex-col border-t border-border-subtle/40 pt-space-4">
            <button
              id="event-exclusions-button"
              type="button"
              class="group flex w-full items-center justify-between gap-space-4 py-space-2 text-left transition-colors focus-visible:focus-ring"
              aria-expanded={state.isExclusionsExpanded()}
              aria-controls="event-exclusions-panel"
              onClick={() => state.toggleExclusions()}
            >
              <span class="text-xl font-semibold text-content transition-colors group-hover:text-brand-accent">
                Nicht enthalten
              </span>
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-muted/40 text-content-muted transition-colors group-hover:border-border-strong group-hover:text-content"
                aria-hidden="true"
              >
                <svg
                  class={classArr(
                    "size-4 stroke-[2] transition-transform duration-200",
                    state.isExclusionsExpanded() && "rotate-180",
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3.5 6l4.5 4.5 4.5-4.5" />
                </svg>
              </div>
            </button>

            <Show when={state.isExclusionsExpanded()}>
              <div
                id="event-exclusions-panel"
                role="region"
                aria-labelledby="event-exclusions-button"
                class="pb-space-2 pt-space-3"
              >
                <ul class="flex flex-col gap-space-3">
                  <For each={state.exclusions()}>
                    {(exclusion) => (
                      <li class="flex items-start gap-space-3 text-sm leading-relaxed text-content-muted sm:text-base">
                        <span
                          class="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border border-danger/30 bg-danger-soft text-danger"
                          aria-hidden="true"
                        >
                          <svg
                            class="size-3 stroke-[2.5]"
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M4.5 4.5l7 7M11.5 4.5l-7 7" />
                          </svg>
                        </span>
                        <span>{exclusion}</span>
                      </li>
                    )}
                  </For>
                </ul>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={state.hasSchedule()}>
          <div class="flex flex-col border-t border-border-subtle/40 pt-space-4">
            <button
              id="event-schedule-button"
              type="button"
              class="group flex w-full items-center justify-between gap-space-4 py-space-2 text-left transition-colors focus-visible:focus-ring"
              aria-expanded={state.isScheduleExpanded()}
              aria-controls="event-schedule-panel"
              onClick={() => state.toggleSchedule()}
            >
              <span class="text-xl font-semibold text-content transition-colors group-hover:text-brand-accent">
                Ablauf
              </span>
              <div
                class="flex size-7 shrink-0 items-center justify-center rounded-full border border-border-subtle/60 bg-surface-muted/40 text-content-muted transition-colors group-hover:border-border-strong group-hover:text-content"
                aria-hidden="true"
              >
                <svg
                  class={classArr(
                    "size-4 stroke-[2] transition-transform duration-200",
                    state.isScheduleExpanded() && "rotate-180",
                  )}
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                >
                  <path d="M3.5 6l4.5 4.5 4.5-4.5" />
                </svg>
              </div>
            </button>

            <Show when={state.isScheduleExpanded()}>
              <div
                id="event-schedule-panel"
                role="region"
                aria-labelledby="event-schedule-button"
                class="mt-space-2 rounded-card border border-brand-accent/15 bg-brand-soft/15 p-space-4 sm:p-space-5"
              >
                <ol class="flex flex-col">
                  <For each={state.schedule()}>
                    {(item) => (
                      <li class="group flex items-start gap-space-3 sm:gap-space-4">
                        <div class="flex flex-col items-center self-stretch pt-1" aria-hidden="true">
                          <span class="size-2 shrink-0 rounded-full bg-brand-accent ring-2 ring-brand-soft" />
                          <span class="mt-1 w-px flex-1 bg-brand-accent/25 group-last:hidden" />
                        </div>
                        <div class="flex flex-1 flex-col gap-1.5 pb-space-4 group-last:pb-0 sm:flex-row sm:items-baseline sm:gap-space-4">
                          <span class="inline-flex w-fit shrink-0 items-center justify-center rounded-full border border-brand-accent/20 bg-brand-soft/20 px-3 py-0.5 text-sm font-medium text-content-muted sm:w-36">
                            {item.marker}
                          </span>
                          <div class="flex flex-1 flex-col gap-0.5">
                            <span class="text-sm font-semibold text-content sm:text-base">{item.title}</span>
                            <Show when={item.detail}>
                              <p class="text-sm leading-relaxed text-content-muted">{item.detail}</p>
                            </Show>
                          </div>
                        </div>
                      </li>
                    )}
                  </For>
                </ol>
              </div>
            </Show>
          </div>
        </Show>

        <Show when={state.hasFaqs()}>
          <div class="flex flex-col gap-space-4 border-t border-border-subtle/40 pt-space-4">
            <h2 class="text-xl font-semibold text-content">Häufige Fragen</h2>
            <ul class="flex flex-col gap-space-3 sm:gap-space-4">
              <For each={state.faqs()}>
                {(faq, index) => {
                  const contentId = `event-faq-panel-${index()}`
                  const buttonId = `event-faq-button-${index()}`

                  return (
                    <li class="overflow-hidden rounded-control border border-border-subtle bg-surface transition-colors">
                      <button
                        id={buttonId}
                        type="button"
                        class="focus-ring group flex w-full items-center justify-between gap-space-4 p-space-5 text-left transition-colors hover:bg-surface-muted/50 sm:p-space-6"
                        aria-expanded={state.isFaqExpanded(faq.id)}
                        aria-controls={contentId}
                        onClick={() => state.toggleFaq(faq.id)}
                      >
                        <span class="text-base font-semibold text-content transition-colors group-hover:text-brand-accent">
                          {faq.question}
                        </span>
                        <div
                          class="flex size-6 shrink-0 items-center justify-center text-content-muted transition-colors group-hover:text-content"
                          aria-hidden="true"
                        >
                          <svg
                            class={classArr(
                              "size-4 stroke-[2] transition-transform duration-200",
                              state.isFaqExpanded(faq.id) && "rotate-180",
                            )}
                            viewBox="0 0 16 16"
                            fill="none"
                            stroke="currentColor"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                          >
                            <path d="M3.5 6l4.5 4.5 4.5-4.5" />
                          </svg>
                        </div>
                      </button>

                      <Show when={state.isFaqExpanded(faq.id)}>
                        <div
                          id={contentId}
                          role="region"
                          aria-labelledby={buttonId}
                          class="border-t border-border-subtle/40 p-space-5 text-base leading-relaxed text-content-muted sm:p-space-6"
                        >
                          {faq.answer}
                        </div>
                      </Show>
                    </li>
                  )
                }}
              </For>
            </ul>
          </div>
        </Show>
      </section>

      {props.children}
    </div>
  )
}
