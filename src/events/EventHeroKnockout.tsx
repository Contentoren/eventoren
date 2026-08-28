import { For } from "solid-js"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { EventFilter } from "./EventFilter.ts"
import { eventHeroKnockoutStateCreate } from "./eventHeroKnockoutStateCreate.ts"

const wordmark = "EVENTOREN"

export function EventHeroKnockout(props: {
  description: string
  eventCount: number
  filter: EventFilter
  onFilterChange: (filter: EventFilter) => void
}) {
  const state = eventHeroKnockoutStateCreate({
    eventCount: () => props.eventCount,
    filter: () => props.filter,
    onFilterChange: (filter) => props.onFilterChange(filter),
  })

  return (
    <section class="relative isolate overflow-hidden bg-surface-inverted" aria-label="Tickets und Erlebnisse finden">
      {/* Warm up the loop images before the first cross-fade. */}
      <div class="hidden">
        <For each={state.preloadUrls()}>{(url) => <img src={url} alt="" aria-hidden="true" decoding="async" />}</For>
      </div>

      {/* Dark stage backdrop: radial brand glow + fine grid. */}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(75%_60%_at_50%_0%,rgba(139,92,246,0.55),transparent_70%),radial-gradient(50%_50%_at_85%_100%,rgba(236,72,153,0.35),transparent_70%),radial-gradient(45%_45%_at_12%_85%,rgba(56,189,248,0.22),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 opacity-[0.12] [background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(70%_60%_at_50%_30%,#000,transparent)]"
      />
      {/* Vignette: darkens the outer edges so white type never sits on a hot glow. */}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_90%_at_50%_40%,transparent_35%,rgba(2,6,23,0.85)_100%)]"
      />

      <UiContainer width="wide" class="relative py-16 sm:py-20">
        <p class="text-center text-xs font-semibold uppercase tracking-[0.35em] text-brand-accent drop-shadow-[0_1px_8px_rgba(2,6,23,0.9)]">
          {state.eventCountLabel()}
        </p>

        {/*
          Text knockout: one accessible <h1> carries the real text, while the
          stacked layers paint the images through the identical glyphs.
        */}
        <h1 class="relative mt-space-6 text-center font-black leading-[0.85] tracking-tight">
          <span class="sr-only">Eventoren – Tickets für Konzerte, Festivals und Live-Events</span>

          <span aria-hidden="true" class="relative block text-[clamp(3rem,15.5vw,13rem)] [font-stretch:condensed]">
            <span class="eventoren-knockout-base block">{wordmark}</span>

            <For each={state.layers()}>
              {(layer) => (
                <span
                  class="eventoren-knockout-layer absolute inset-0 block"
                  style={{
                    "background-image": `url(${layer.imageUrl})`,
                    "background-position": layer.origin,
                    "--eventoren-knockout-duration": layer.duration,
                    "--eventoren-knockout-delay": layer.delay,
                  }}
                >
                  {wordmark}
                </span>
              )}
            </For>
          </span>
        </h1>

        <p class="mx-auto mt-space-6 max-w-2xl text-center text-base font-medium leading-relaxed text-white drop-shadow-[0_1px_10px_rgba(2,6,23,0.95)]">
          {props.description}
        </p>

        {/* Floating single-line quick filter bar. */}
        <form
          class="mx-auto mt-space-7 max-w-4xl rounded-full border border-border-strong bg-surface/90 p-space-2 shadow-2xl shadow-black/60 ring-1 ring-inset ring-white/5 backdrop-blur-xl focus-within:border-brand-accent"
          aria-label="Schnellsuche"
          onSubmit={(event) => {
            event.preventDefault()
            state.submitSearch()
          }}
        >
          <div class="flex flex-col gap-space-2 md:flex-row md:items-center">
            <div class="flex-1 px-space-4 py-space-2">
              <label
                for="hero-knockout-term"
                class="block text-[10px] font-semibold uppercase tracking-widest text-content-muted"
              >
                Event / Künstler
              </label>
              <input
                id="hero-knockout-term"
                type="search"
                value={state.term()}
                placeholder="z. B. Wacken Open Air"
                onInput={(event) => state.changeTerm(event.currentTarget.value)}
                class="focus-ring w-full bg-transparent text-sm font-medium text-content placeholder:text-content-muted/80"
              />
            </div>

            <div aria-hidden="true" class="hidden h-9 w-px bg-border-strong md:block" />

            <div class="flex-1 px-space-4 py-space-2">
              <label
                for="hero-knockout-city"
                class="block text-[10px] font-semibold uppercase tracking-widest text-content-muted"
              >
                Ort
              </label>
              <input
                id="hero-knockout-city"
                type="search"
                value={state.city()}
                placeholder="z. B. Berlin"
                onInput={(event) => state.changeCity(event.currentTarget.value)}
                class="focus-ring w-full bg-transparent text-sm font-medium text-content placeholder:text-content-muted/80"
              />
            </div>

            <div aria-hidden="true" class="hidden h-9 w-px bg-border-strong md:block" />

            <div class="flex-1 px-space-4 py-space-2">
              <label
                for="hero-knockout-when"
                class="block text-[10px] font-semibold uppercase tracking-widest text-content-muted"
              >
                Wann
              </label>
              <select
                id="hero-knockout-when"
                value={state.activeTimeWindow()}
                onChange={(event) => state.selectTimeWindow(event.currentTarget.value as never)}
                class="focus-ring w-full appearance-none bg-transparent text-sm font-medium text-content"
              >
                <For each={state.timeWindowOptions()}>
                  {(option) => (
                    <option
                      value={option.value}
                      selected={state.activeTimeWindow() === option.value}
                      class="bg-surface text-content"
                    >
                      {option.label}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <button
              type="submit"
              class="focus-ring h-12 shrink-0 rounded-full bg-brand px-space-7 text-sm font-semibold text-brand-content transition-colors hover:bg-brand-strong"
            >
              Tickets finden
            </button>
          </div>
        </form>

        {/* Direct-filter chips. */}
        <fieldset class="mt-space-6 flex flex-wrap justify-center gap-space-2">
          <legend class="sr-only">Direktfilter</legend>
          <For each={state.quickChips()}>
            {(chip) => (
              <button
                type="button"
                aria-pressed={state.chipActiveId() === chip.id}
                onClick={() => state.selectChip(chip.id)}
                class={`focus-ring rounded-full px-space-5 py-space-2 text-sm font-semibold transition-colors ${
                  state.chipActiveId() === chip.id
                    ? "border border-transparent bg-content-inverted text-surface-inverted shadow-lg shadow-black/40"
                    : "border border-border-strong bg-surface/80 text-content-muted backdrop-blur hover:border-brand-accent hover:bg-surface hover:text-content"
                }`}
              >
                {chip.label}
              </button>
            )}
          </For>
        </fieldset>
      </UiContainer>
    </section>
  )
}
