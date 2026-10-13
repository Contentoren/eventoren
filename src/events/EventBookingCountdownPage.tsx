import { For, Show } from "solid-js"
import type { EventItem } from "./EventItem.ts"
import { eventBookingCountdownPageStateCreate } from "./eventBookingCountdownPageStateCreate.ts"
import { UiContainer } from "../ui/UiContainer.tsx"

export function EventBookingCountdownPage(props: { event: EventItem; now?: () => number }) {
  const state = eventBookingCountdownPageStateCreate({ event: () => props.event, now: () => props.now })
  return (
    <main id="content" tabindex="-1">
      <UiContainer width="wide" class="py-5 sm:py-8">
        <section
          class="relative isolate mx-auto min-h-[min(760px,90svh)] w-full overflow-hidden rounded-3xl bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 text-white shadow-2xl"
          aria-label="Buchungsstart"
        >
          <Show when={state.image()} keyed>
            {(image) => (
              <Show when={!image.failed()}>
                <img
                  src={image.src}
                  alt={state.event().imageAlt}
                  onError={image.onError}
                  class="absolute inset-0 -z-20 h-full w-full object-cover"
                  fetchpriority="high"
                />
              </Show>
            )}
          </Show>
          <div class="absolute inset-0 -z-10 bg-gradient-to-b from-black/55 via-slate-950/45 to-slate-950/95" />
          <div class="flex min-h-[min(760px,90svh)] flex-col justify-between gap-16 px-4 py-8 sm:px-10 sm:py-12 lg:px-16">
            <header class="max-w-4xl">
              <p class="mb-4 text-xs font-semibold uppercase tracking-[0.25em] text-teal-200">
                Ein besonderer Moment. Dein Event.
              </p>
              <h1 class="break-words text-4xl font-semibold leading-tight tracking-tight sm:text-6xl lg:text-7xl">
                {state.event().title}
              </h1>
              <Show when={state.event().subtitle}>
                <p class="mt-4 max-w-2xl text-lg text-white/85 sm:text-2xl">{state.event().subtitle}</p>
              </Show>
            </header>
            <div class="mx-auto w-full max-w-3xl pb-2 text-center">
              <p class="text-xl font-medium sm:text-3xl">Die Vorfreude läuft.</p>
              <p class="mt-3 text-xs font-semibold uppercase tracking-[0.22em] text-teal-200">Buchungsstart in</p>
              <div
                class="mt-6 grid grid-cols-4 gap-2 sm:gap-4"
                role="timer"
                aria-label="Verbleibende Zeit bis zum Buchungsstart"
                aria-live="off"
              >
                <For each={state.parts()}>
                  {(part) => (
                    <div class="min-w-0 rounded-2xl border border-white/15 bg-white/10 px-1 py-5 shadow-lg backdrop-blur-md sm:py-8">
                      <span class="block text-3xl font-light tabular-nums tracking-tight sm:text-6xl">
                        {part.value}
                      </span>
                      <span class="mt-2 block text-[10px] font-medium text-teal-100 sm:text-sm">{part.label}</span>
                    </div>
                  )}
                </For>
              </div>
              <p class="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-white/80">{state.openingDate()}</p>
              <p class="mt-2 text-xs text-white/60">Die Buchung öffnet sich automatisch zum Start.</p>
            </div>
          </div>
        </section>
      </UiContainer>
    </main>
  )
}
