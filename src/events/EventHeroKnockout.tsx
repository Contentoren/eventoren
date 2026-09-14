import { For } from "solid-js"
import { Button } from "#ui/interactive/button/Button.jsx"
import { classArr } from "../ui/classArr.ts"
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
    <section
      class="relative isolate overflow-hidden bg-surface-base transition-colors duration-300"
      aria-label="Tickets und Erlebnisse finden"
    >
      {/* Warm up the loop images before the first cross-fade. */}
      <div class="hidden">
        <For each={state.preloadUrls()}>{(url) => <img src={url} alt="" aria-hidden="true" decoding="async" />}</For>
      </div>

      {/* Bright ambient backdrop: soft colorful brand glows + light grid. */}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_65%_at_50%_0%,rgba(139,92,246,0.22),transparent_75%),radial-gradient(60%_60%_at_85%_90%,rgba(236,72,153,0.14),transparent_70%),radial-gradient(55%_55%_at_15%_80%,rgba(56,189,248,0.15),transparent_70%)]"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute inset-0 opacity-[0.06] [background-image:linear-gradient(to_right,#000_1px,transparent_1px),linear-gradient(to_bottom,#000_1px,transparent_1px)] dark:opacity-[0.08] dark:[background-image:linear-gradient(to_right,#fff_1px,transparent_1px),linear-gradient(to_bottom,#fff_1px,transparent_1px)] [background-size:64px_64px] [mask-image:radial-gradient(70%_60%_at_50%_40%,#000,transparent)]"
      />

      <UiContainer width="wide" class="relative py-16 sm:py-20">
        <div class="flex justify-center">
          <p class="inline-flex items-center rounded-full border border-brand-accent/30 bg-surface/90 px-4 py-1.5 text-center text-sm font-semibold uppercase tracking-[0.25em] text-brand-accent shadow-md backdrop-blur-md">
            {state.eventCountLabel()}
          </p>
        </div>

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

        <p class="mx-auto mt-space-6 max-w-2xl text-center text-base font-semibold leading-relaxed text-content-muted">
          {props.description}
        </p>

        {/* Floating single-line quick filter bar. */}
        <form
          class="mx-auto mt-space-7 max-w-4xl rounded-card border border-border-strong/60 bg-surface/95 p-space-2 shadow-xl shadow-black/5 ring-1 ring-inset ring-black/5 backdrop-blur-xl focus-within:border-brand-accent"
          aria-label="Schnellsuche"
          onSubmit={(event) => {
            event.preventDefault()
            state.submitSearch()
          }}
        >
          <div class="flex flex-col gap-space-2 md:flex-row md:items-center">
            <div class="flex-1 px-space-4 py-space-2">
              <label for="hero-knockout-term" class="block text-sm font-bold uppercase tracking-wider text-content">
                Event / Künstler
              </label>
              <input
                id="hero-knockout-term"
                type="search"
                value={state.term()}
                placeholder="z. B. Wacken Open Air"
                onInput={(event) => state.changeTerm(event.currentTarget.value)}
                class="focus-ring w-full bg-transparent text-sm font-medium text-content placeholder:text-content-muted"
              />
            </div>

            <div aria-hidden="true" class="hidden h-9 w-px bg-border-strong md:block" />

            <div class="flex-1 px-space-4 py-space-2">
              <label for="hero-knockout-city" class="block text-sm font-bold uppercase tracking-wider text-content">
                Ort
              </label>
              <input
                id="hero-knockout-city"
                type="search"
                value={state.city()}
                placeholder="z. B. Berlin"
                onInput={(event) => state.changeCity(event.currentTarget.value)}
                class="focus-ring w-full bg-transparent text-sm font-medium text-content placeholder:text-content-muted"
              />
            </div>

            <div aria-hidden="true" class="hidden h-9 w-px bg-border-strong md:block" />

            <div class="flex-1 px-space-4 py-space-2">
              <label for="hero-knockout-when" class="block text-sm font-bold uppercase tracking-wider text-content">
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
                      class="bg-surface text-content text-sm font-medium"
                    >
                      {option.label}
                    </option>
                  )}
                </For>
              </select>
            </div>

            <Button
              variant="none"
              size="none"
              type="submit"
              class="focus-ring h-12 shrink-0 rounded-control bg-brand px-space-7 text-base font-bold text-brand-content shadow-md transition-colors hover:bg-brand-strong"
            >
              Tickets finden
            </Button>
          </div>
        </form>

        {/* Direct-filter chips. */}
        <fieldset class="mt-space-6 flex flex-wrap justify-center gap-space-2">
          <legend class="sr-only">Direktfilter</legend>
          <For each={state.quickChips()}>
            {(chip) => (
              <Button
                variant="none"
                size="none"
                type="button"
                aria-pressed={state.chipActiveId() === chip.id}
                onClick={() => state.selectChip(chip.id)}
                class={classArr(
                  "focus-ring rounded-control px-space-5 py-space-2 text-sm font-semibold transition-colors",
                  state.chipActiveId() === chip.id
                    ? "border border-transparent bg-brand text-brand-content shadow-lg shadow-black/40"
                    : "border border-border-strong bg-surface/90 text-content backdrop-blur hover:border-brand-accent hover:bg-surface hover:text-brand-accent",
                )}
              >
                {chip.label}
              </Button>
            )}
          </For>
        </fieldset>
      </UiContainer>
    </section>
  )
}
