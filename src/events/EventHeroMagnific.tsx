import { For } from "solid-js"
import { classArr } from "../ui/classArr.ts"
import { UiContainer } from "../ui/UiContainer.tsx"
import { eventHeroMagnificStateCreate } from "./eventHeroMagnificStateCreate.ts"
import { eventHeroResultsAnchorId } from "./eventHeroResultsAnchorId.ts"

export function EventHeroMagnific(props: { eventCount?: number }) {
  const state = eventHeroMagnificStateCreate({
    eventCount: () => props.eventCount ?? 0,
  })

  return (
    <UiContainer width="wide" class="py-space-5 sm:py-space-6">
      <section
        class="relative w-full overflow-hidden rounded-3xl border border-white/10 bg-[#0a0d24] bg-gradient-to-b from-[#0f143a] via-[#1a1744] to-[#070919] px-6 py-12 text-white shadow-2xl sm:px-10 sm:py-16 lg:px-14 xl:px-16"
        aria-label="Eventoren Live-Entertainment Plattform"
      >
        {/* Atmosphere background glows & cinematic texture */}
        <div
          aria-hidden="true"
          class="pointer-events-none absolute -top-40 left-1/4 h-[550px] w-[750px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#4f46e5_0%,transparent_70%)] opacity-25 blur-3xl"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute right-10 top-1/4 h-[450px] w-[550px] rounded-full bg-[radial-gradient(circle_at_center,#8b5cf6_0%,transparent_70%)] opacity-20 blur-3xl"
        />
        <div
          aria-hidden="true"
          class="pointer-events-none absolute bottom-0 left-1/2 h-[350px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#38bdf8_0%,transparent_75%)] opacity-15 blur-3xl"
        />
        <img
          src="/images/festival-lights_3f89b9a5.webp"
          alt=""
          aria-hidden="true"
          class="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-10 mix-blend-screen"
        />

        {/* Main hero grid */}
        <div class="relative mx-auto flex w-full flex-col justify-between gap-12 lg:flex-row lg:items-center">
          {/* Left column */}
          <div class="flex max-w-2xl flex-col items-start gap-6">
            {/* Headline */}
            <h2 class="text-5xl font-black tracking-tight text-white sm:text-6xl lg:text-7xl">EVENTOREN</h2>

            {/* Subheadline */}
            <p class="max-w-xl text-base leading-relaxed text-white/80 sm:text-lg">
              Konzerte, Festivals, Theater und Sportevents. Sichere Buchung mit mobilem Direktticket, transparenten
              Festpreisen und exklusivem Presale-Zugang.
            </p>

            {/* CTA Buttons */}
            <div class="flex flex-wrap items-center gap-4 pt-2">
              <a
                href={`#${eventHeroResultsAnchorId}`}
                class="focus-ring rounded-control bg-brand px-6 py-3 text-base font-bold text-brand-content shadow-lg shadow-brand/25 transition-all hover:bg-brand-strong active:scale-[0.98]"
              >
                Events entdecken
              </a>
            </div>
          </div>

          {/* Right column: Vertical Ticker */}
          <div class="hidden lg:block lg:flex-1">
            <div class="relative flex h-[420px] items-center justify-center">
              {/* Ticker container with center pointer */}
              <div class="relative flex w-full max-w-lg items-center gap-6">
                {/* Fixed brand accent play pointer at vertical center row */}
                <div class="flex shrink-0 items-center justify-center" aria-hidden="true">
                  <svg
                    width="28"
                    height="28"
                    viewBox="0 0 24 24"
                    class="size-7 fill-brand text-brand"
                    aria-hidden="true"
                  >
                    <polygon points="4,2 22,12 4,22" fill="currentColor" />
                  </svg>
                </div>

                {/* Overflow-hidden window of height 420px */}
                <div
                  class="h-[420px] w-full overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)] [-webkit-mask-image:linear-gradient(to_bottom,transparent,black_15%,black_85%,transparent)]"
                  aria-live="off"
                >
                  <div
                    class="flex flex-col will-change-transform"
                    style={{
                      transform: `translateY(${state.tickerOffset()})`,
                      transition: state.isTransitionEnabled() ? "transform 700ms ease-in-out" : "none",
                    }}
                  >
                    <For each={state.tickerItems()}>
                      {(item, index) => {
                        const isActive = () => index() === state.activeVirtualIndex()

                        return (
                          <div
                            class={classArr(
                              "flex h-[60px] shrink-0 items-center text-3xl tracking-tight",
                              isActive() ? "font-bold text-white" : "font-normal text-white",
                            )}
                            style={{
                              opacity: state.tickerItemOpacity(index()),
                              transition: state.isTransitionEnabled() ? "opacity 700ms ease-in-out" : "none",
                            }}
                            aria-hidden={!isActive()}
                          >
                            {item}
                          </div>
                        )
                      }}
                    </For>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Social Proof Section */}
        <div class="relative mx-auto mt-16 w-full border-t border-white/10 pt-10">
          <p class="mb-6 text-center text-sm font-medium text-white/80">
            Vertraut von über 500.000 Fans &amp; Partner-Veranstaltern
          </p>

          <div class="flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            <For each={state.partnerLogos()}>
              {(partner) => (
                <div class="flex items-center text-base font-black tracking-wider text-white/50 transition-colors duration-300 hover:text-white sm:text-lg">
                  {partner}
                </div>
              )}
            </For>
          </div>
        </div>
      </section>
    </UiContainer>
  )
}
