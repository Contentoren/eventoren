import { Link } from "@tanstack/solid-router"
import { For } from "solid-js"
import { UiContainer } from "../ui/UiContainer.tsx"
import type { EventCategory } from "./EventCategory.ts"
import type { EventFilter } from "./EventFilter.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventHeroShowcaseStateCreate } from "./eventHeroShowcaseStateCreate.ts"

export function EventHeroShowcase(props: {
  filter: EventFilter
  onFilterChange: (filter: EventFilter) => void
  title?: string
  subtitle?: string
}) {
  const state = eventHeroShowcaseStateCreate({
    filter: () => props.filter,
    onFilterChange: (filter) => props.onFilterChange(filter),
  })

  return (
    <section
      class="relative isolate flex flex-col bg-surface-base"
      aria-label="Featured Headliner und Event-Suche"
      aria-roledescription="carousel"
      onMouseEnter={state.pauseAutoAdvance}
      onMouseLeave={state.resumeAutoAdvance}
      onFocusIn={state.pauseAutoAdvance}
      onFocusOut={state.resumeAutoAdvance}
    >
      {/* Top Carousel Section with multi-slide peek */}
      <div class="relative w-full overflow-hidden bg-black py-4 sm:py-6">
        {/* Peek Carousel Viewport */}
        <div class="relative mx-auto w-full max-w-[1600px] overflow-hidden">
          {/* Carousel Track */}
          <div
            class="flex items-center transition-transform duration-500 ease-out"
            style={{
              transform: `translateX(calc(7.5% - ${state.activeSlideIndex() * 85}%))`,
            }}
          >
            <For each={state.slides()}>
              {(slide, index) => {
                const isActive = () => index() === state.activeSlideIndex()

                return (
                  <article
                    class="w-[85%] shrink-0 px-2 sm:px-3 md:px-4"
                    aria-hidden={!isActive()}
                    aria-label={`${index() + 1} von ${state.slides().length}: ${slide.title}`}
                  >
                    <div
                      class={`relative aspect-[16/9] min-h-[360px] sm:min-h-[440px] md:min-h-[500px] lg:min-h-[560px] overflow-hidden rounded-2xl bg-neutral-900 shadow-2xl transition-all duration-500 ${
                        isActive() ? "scale-100 opacity-100 ring-1 ring-white/10" : "scale-[0.97] opacity-50"
                      }`}
                    >
                      {/* Artist Background Image */}
                      <img
                        src={slide.imageUrl}
                        alt={slide.imageAlt}
                        loading={index() === 0 ? "eager" : "lazy"}
                        width="1440"
                        height="800"
                        class="absolute inset-0 size-full object-cover object-center"
                      />

                      {/* Dark Gradient Overlay for Readability */}
                      <div
                        aria-hidden="true"
                        class="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent"
                      />

                      {/* Overlay Bottom-Left: Artist Name and Tickets & Infos CTA */}
                      <div class="absolute bottom-12 left-6 z-10 flex max-w-2xl flex-col items-start gap-4 sm:bottom-14 sm:left-10 md:bottom-16 md:left-12">
                        <h3 class="text-3xl font-bold tracking-tight text-white drop-shadow-md sm:text-4xl lg:text-5xl">
                          <Link
                            to="/events/$eventId"
                            params={{ eventId: slide.id }}
                            tabIndex={isActive() ? 0 : -1}
                            class="focus-ring rounded-control hover:underline"
                          >
                            {slide.title}
                          </Link>
                        </h3>

                        <Link
                          to="/events/$eventId"
                          params={{ eventId: slide.id }}
                          tabIndex={isActive() ? 0 : -1}
                          class="focus-ring inline-flex items-center justify-center rounded-control bg-brand px-5 py-2.5 text-sm font-bold uppercase tracking-wider text-brand-content shadow-md transition-colors hover:bg-brand-strong active:scale-[0.98] sm:text-base"
                        >
                          TICKETS & INFOS
                        </Link>
                      </div>
                    </div>
                  </article>
                )
              }}
            </For>
          </div>

          {/* Floating Circular Navigation Chevrons: Left (<) and Right (>) */}
          <button
            type="button"
            onClick={state.prevSlide}
            aria-label="Vorheriger Slide"
            class="focus-ring absolute left-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand shadow-xl transition-all hover:scale-105 hover:bg-neutral-100 hover:text-brand-strong active:scale-95 sm:left-4 sm:size-12 md:left-6"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-5 sm:size-6"
              aria-hidden="true"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>

          <button
            type="button"
            onClick={state.nextSlide}
            aria-label="Nächster Slide"
            class="focus-ring absolute right-2 top-1/2 z-20 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white text-brand shadow-xl transition-all hover:scale-105 hover:bg-neutral-100 hover:text-brand-strong active:scale-95 sm:right-4 sm:size-12 md:right-6"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="3"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="size-5 sm:size-6"
              aria-hidden="true"
            >
              <path d="m9 18 6-6-6-6" />
            </svg>
          </button>

          {/* Bottom Center Controls: Dots */}
          <div class="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2 rounded-full bg-black/40 px-3 py-1.5 backdrop-blur-xs sm:bottom-4">
            <For each={state.slides()}>
              {(_, index) => {
                const isActive = () => index() === state.activeSlideIndex()

                return (
                  <button
                    type="button"
                    onClick={() => state.goToSlide(index())}
                    aria-label={`Zu Slide ${index() + 1} springen`}
                    class={`h-2.5 rounded-full transition-all sm:h-3 ${
                      isActive() ? "w-6 bg-brand sm:w-8" : "w-2.5 bg-white/70 hover:bg-white sm:w-3"
                    }`}
                  />
                )
              }}
            </For>
          </div>
        </div>
      </div>

      {/* Bottom Dark Section */}
      <div class="border-b border-neutral-800 bg-black py-10 sm:py-14">
        <UiContainer width="wide" class="flex flex-col items-center">
          {/* Centered Headline */}
          <h2 class="mb-6 text-center text-2xl font-bold text-white sm:text-3xl">
            {props.title ?? "Alle Konzerte und Shows im Überblick"}
          </h2>

          {/* LiveNation Search Bar Form */}
          <search aria-label="Events durchsuchen" class="w-full">
            <form
              class="mx-auto grid max-w-5xl grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_1.2fr_1fr_auto] lg:items-center"
              onSubmit={state.submitSearch}
            >
              {/* 🎵 Genres Dropdown */}
              <div class="relative flex h-13 items-center rounded-control border border-[#444] bg-[#2a2a2a] px-4 transition-colors focus-within:border-white focus-within:ring-2 focus-within:ring-white/20">
                <label for="livenation-hero-genre" class="sr-only">
                  Genres
                </label>
                <span class="mr-3 shrink-0 text-neutral-400" aria-hidden="true">
                  <svg class="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 3v10.55c-.59-.34-1.27-.55-2-.55-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4V7h4V3z" />
                  </svg>
                </span>
                <select
                  id="livenation-hero-genre"
                  aria-label="Genres"
                  value={props.filter.category}
                  onChange={(event) => state.selectCategory(event.currentTarget.value as EventCategory | "alle")}
                  class="h-full w-full cursor-pointer appearance-none bg-transparent pr-6 text-sm font-medium text-white focus:outline-none"
                >
                  <For each={state.categoryOptions()}>
                    {(option) => (
                      <option value={option.value} class="bg-[#2a2a2a] text-white">
                        {option.label}
                      </option>
                    )}
                  </For>
                </select>
                <span class="pointer-events-none absolute right-4 text-neutral-400" aria-hidden="true">
                  <svg
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>

              {/* 📍 Alle Städte Search Input */}
              <div class="relative flex h-13 items-center rounded-control border border-[#444] bg-[#2a2a2a] px-4 transition-colors focus-within:border-white focus-within:ring-2 focus-within:ring-white/20">
                <label for="livenation-hero-location" class="sr-only">
                  Alle Städte
                </label>
                <span class="mr-3 shrink-0 text-neutral-400" aria-hidden="true">
                  <svg class="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7m0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5" />
                  </svg>
                </span>
                <input
                  id="livenation-hero-location"
                  type="search"
                  aria-label="Alle Städte"
                  placeholder="Alle Städte"
                  value={props.filter.query}
                  onInput={(event) => state.selectQuery(event.currentTarget.value)}
                  class="h-full w-full bg-transparent text-sm font-medium text-white placeholder:text-neutral-400 focus:outline-none"
                />
              </div>

              {/* 📅 DD.MM.YYYY – DD.MM.YYYY Time Window Select */}
              <div class="relative flex h-13 items-center rounded-control border border-[#444] bg-[#2a2a2a] px-4 transition-colors focus-within:border-white focus-within:ring-2 focus-within:ring-white/20">
                <label for="livenation-hero-date" class="sr-only">
                  Datum
                </label>
                <span class="mr-3 shrink-0 text-neutral-400" aria-hidden="true">
                  <svg class="size-5 fill-current" viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2m0 16H5V10h14zM9 14H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2zm-8 4H7v-2h2zm4 0h-2v-2h2zm4 0h-2v-2h2z" />
                  </svg>
                </span>
                <select
                  id="livenation-hero-date"
                  aria-label="Datum"
                  value={props.filter.timeWindow}
                  onChange={(event) => state.selectTimeWindow(event.currentTarget.value as EventTimeWindow)}
                  class="h-full w-full cursor-pointer appearance-none bg-transparent pr-6 text-sm font-medium text-white focus:outline-none"
                >
                  <For each={state.timeWindowOptions()}>
                    {(option) => (
                      <option value={option.value} class="bg-[#2a2a2a] text-white">
                        {option.label}
                      </option>
                    )}
                  </For>
                </select>
                <span class="pointer-events-none absolute right-4 text-neutral-400" aria-hidden="true">
                  <svg
                    class="size-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    stroke-width="2"
                    aria-hidden="true"
                  >
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                  </svg>
                </span>
              </div>

              {/* Submit Button "Events suchen" */}
              <button
                type="submit"
                class="focus-ring flex h-13 items-center justify-center rounded-control bg-brand px-8 py-3.5 text-base font-bold text-brand-content shadow-md transition-all hover:bg-brand-strong active:scale-[0.98] whitespace-nowrap cursor-pointer"
              >
                Events suchen
              </button>
            </form>
          </search>
        </UiContainer>
      </div>
    </section>
  )
}
